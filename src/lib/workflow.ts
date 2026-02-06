import OpenAI from "openai";
import * as dotenv from "dotenv";
import { getVectorStoreIds } from "./documentStore";
dotenv.config({ path: ".env.local" });

const openai = new OpenAI();

// Vector store IDs (defaults, overridden by document store registry)
const DEFAULT_VECTOR_STORE_1 = "vs_697e524aef9c819182db0e8bbfc98456";
const DEFAULT_VECTOR_STORE_2 = "vs_697e529683e081919d31a8ab7a2bc02a";

// Analysis configuration for different check types
export interface AnalysisConfig {
  id: string;
  name: string;
  extractionInstruction: string;
  searchQueries: string[];
  orchestratorPrompt: string;
  valueExtractor: (texts: string[]) => string;
  confidenceCalculator: (docs: string[], orchestratorOutput: string) => number;
}

export interface WorkflowResult {
  name: string;
  value: string;
  confidence: number;
  note: string;
  noteType: "zhoda" | "problem";
  details: {
    doc1: string;
    doc2: string;
    doc3: string;
    orchestrator: string;
    category: string;
    finalOutput: string;
  };
}

// ============ Akonfigurácie analýz ============

// Počet podlaží (Floor count) configuration
const podlaziaConfig: AnalysisConfig = {
  id: "pocet_podlazi",
  name: "Počet podlaží",
  extractionInstruction: `Prehľadaj dokument a zisti, koľko podlaží má objekt.
Odpovedz iba v tomto formáte: Počet podzemných podlaží: X, Počet nadzemných podlaží: Y
Nepridávaj žiadny ďalší text.`,
  searchQueries: [
    "počet podlaží objektu",
    "počet podlaží budovy",
    "počet nadzemných a podzemných podlaží"
  ],
  orchestratorPrompt: `Posúď zhodu medzi zistenými počtami podlaží z rôznych dokumentov.
Odpovedz iba v tomto formáte: Zhodujú sa: áno/nie
Nepridávaj žiadny ďalší text.`,
  valueExtractor: (texts: string[]): string => {
    for (const text of texts) {
      const undergroundMatch = text.match(/podzemn[ýé]ch?\s*podlaží?:?\s*(\d+)/i);
      const aboveMatch = text.match(/nadzemn[ýé]ch?\s*podlaží?:?\s*(\d+)/i);
      if (undergroundMatch || aboveMatch) {
        const underground = undergroundMatch ? undergroundMatch[1] : "?";
        const above = aboveMatch ? aboveMatch[1] : "?";
        return `${underground} PP + ${above} NP`;
      }
    }
    return "Nezistené";
  },
  confidenceCalculator: (docs: string[], orchestratorOutput: string): number => {
    const extractFloors = (text: string): { underground: number | null; above: number | null } => {
      const undergroundMatch = text.match(/podzemn[ýé]ch?\s*podlaží?:?\s*(\d+)/i);
      const aboveMatch = text.match(/nadzemn[ýé]ch?\s*podlaží?:?\s*(\d+)/i);
      return {
        underground: undergroundMatch ? parseInt(undergroundMatch[1]) : null,
        above: aboveMatch ? parseInt(aboveMatch[1]) : null
      };
    };

    const floorData = docs.map(extractFloors);
    let matches = 0;
    let total = 0;

    // Compare underground floors
    const undergrounds = floorData.map(f => f.underground).filter(x => x !== null);
    if (undergrounds.length > 1) {
      const unique = new Set(undergrounds);
      if (unique.size === 1) matches += 2;
      else if (unique.size === 2) matches += 1;
      total += 2;
    }

    // Compare above-ground floors
    const aboves = floorData.map(f => f.above).filter(x => x !== null);
    if (aboves.length > 1) {
      const unique = new Set(aboves);
      if (unique.size === 1) matches += 2;
      else if (unique.size === 2) matches += 1;
      total += 2;
    }

    // Check orchestrator output
    const isMatch = orchestratorOutput.toLowerCase().includes("áno");
    if (isMatch) matches += 1;
    total += 1;

    if (total === 0) return 0.5;
    return Math.min(1, Math.max(0, matches / total));
  }
};

// Počet parkovacích miest (Parking spots count) configuration
const parkovanieConfig: AnalysisConfig = {
  id: "pocet_parkovacich_miest",
  name: "Počet parkovacích miest",
  extractionInstruction: `Prehľadaj dokument a zisti, koľko parkovacích miest má objekt.
Odpovedz iba v tomto formáte: Počet parkovacích miest: X
Ak sú rozdelené na vonkajšie a vnútorné/garážové, uveď: Vonkajšie: X, Garážové: Y
Nepridávaj žiadny ďalší text.`,
  searchQueries: [
    "počet parkovacích miest",
    "parkovacie státia",
    "parkovanie garáž"
  ],
  orchestratorPrompt: `Posúď zhodu medzi zistenými počtami parkovacích miest z rôznych dokumentov.
Odpovedz iba v tomto formáte: Zhodujú sa: áno/nie
Nepridávaj žiadny ďalší text.`,
  valueExtractor: (texts: string[]): string => {
    for (const text of texts) {
      // Try to extract total parking spots
      const totalMatch = text.match(/parkovac[íi]ch?\s*miest:?\s*(\d+)/i);
      const vonkajsieMatch = text.match(/vonkajš[íi][ea]?:?\s*(\d+)/i);
      const garazoveMatch = text.match(/garáž[oa]v[ée]?:?\s*(\d+)/i);
      
      if (vonkajsieMatch || garazoveMatch) {
        const vonkajsie = vonkajsieMatch ? vonkajsieMatch[1] : "0";
        const garazove = garazoveMatch ? garazoveMatch[1] : "0";
        return `${vonkajsie} vonk. + ${garazove} gar.`;
      }
      if (totalMatch) {
        return `${totalMatch[1]} miest`;
      }
    }
    return "Nezistené";
  },
  confidenceCalculator: (docs: string[], orchestratorOutput: string): number => {
    const extractParking = (text: string): number | null => {
      const totalMatch = text.match(/parkovac[íi]ch?\s*miest:?\s*(\d+)/i);
      const vonkajsieMatch = text.match(/vonkajš[íi][ea]?:?\s*(\d+)/i);
      const garazoveMatch = text.match(/garáž[oa]v[ée]?:?\s*(\d+)/i);
      
      if (totalMatch) return parseInt(totalMatch[1]);
      if (vonkajsieMatch || garazoveMatch) {
        const v = vonkajsieMatch ? parseInt(vonkajsieMatch[1]) : 0;
        const g = garazoveMatch ? parseInt(garazoveMatch[1]) : 0;
        return v + g;
      }
      return null;
    };

    const parkingCounts = docs.map(extractParking).filter(x => x !== null);
    let matches = 0;
    let total = 0;

    if (parkingCounts.length > 1) {
      const unique = new Set(parkingCounts);
      if (unique.size === 1) matches += 3;
      else if (unique.size === 2) matches += 1;
      total += 3;
    }

    // Check orchestrator output
    const isMatch = orchestratorOutput.toLowerCase().includes("áno");
    if (isMatch) matches += 1;
    total += 1;

    if (total === 0) return 0.5;
    return Math.min(1, Math.max(0, matches / total));
  }
};

// All available analysis configurations
export const ANALYSIS_CONFIGS: AnalysisConfig[] = [
  podlaziaConfig,
  parkovanieConfig
];

// ============ HELPER FUNCTIONS ============

// Helper function to search in vector store and get response
async function searchAndExtract(
  vectorStoreId: string,
  query: string,
  instruction: string
): Promise<string> {
  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      tools: [
        {
          type: "file_search",
          vector_store_ids: [vectorStoreId],
        },
      ],
      input: `${instruction}\n\nVyhľadaj informácie o: ${query}`,
    });

    if (response.output && response.output.length > 0) {
      for (const item of response.output) {
        if (item.type === "message" && "content" in item) {
          const messageItem = item as any;
          if (messageItem.content && Array.isArray(messageItem.content)) {
            for (const content of messageItem.content) {
              if (content.type === "output_text" && content.text) {
                return content.text;
              }
            }
          }
        }
      }
    }

    if (response.output_text) {
      return response.output_text;
    }

    return "Nepodarilo sa extrahovať informácie z dokumentu.";
  } catch (error) {
    console.error("Error in searchAndExtract:", error);
    throw error;
  }
}

// Simple chat completion for orchestration and classification
async function chat(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0,
  });

  return response.choices[0]?.message?.content ?? "";
}

// Classify the result
async function classifyResult(orchestratorOutput: string): Promise<"zhoda" | "problem_s_korespondenciou"> {
  const systemPrompt = `### ROLE
You are a careful classification assistant.

### TASK
Choose exactly one category based on the orchestrator's output.

### CATEGORIES
- zhoda
- problem_s_korespondenciou

### RULES
- If the documents match (zhodujú sa: áno), return "zhoda".
- If there is a mismatch or problem, return "problem_s_korespondenciou".

### OUTPUT FORMAT
Return only the category name, nothing else.`;

  const result = await chat(systemPrompt, orchestratorOutput);
  const trimmed = result.trim().toLowerCase();
  
  if (trimmed.includes("zhoda") && !trimmed.includes("problem")) {
    return "zhoda";
  }
  return "problem_s_korespondenciou";
}

// ============ MAIN WORKFLOW ============

type WorkflowInput = { input_as_text: string };

export type StepCallback = (step: { 
  name: string; 
  status: 'running' | 'completed' | 'error'; 
  output?: string;
  analysisId?: string;
}) => void;

// Run a single analysis based on config
async function runSingleAnalysis(
  config: AnalysisConfig,
  onStep?: StepCallback
): Promise<WorkflowResult> {
  const stepPrefix = `[${config.name}]`;

  // Get vector store IDs dynamically from registry
  const storeIds = getVectorStoreIds();
  const vs1 = storeIds[0] || DEFAULT_VECTOR_STORE_1;
  const vs2 = storeIds[1] || DEFAULT_VECTOR_STORE_2;

  // Step 1: Document 1 extraction
  onStep?.({ name: `${stepPrefix} Dokument 1`, status: 'running', analysisId: config.id });
  const doc1Output = await searchAndExtract(vs1, config.searchQueries[0], config.extractionInstruction);
  onStep?.({ name: `${stepPrefix} Dokument 1`, status: 'completed', output: doc1Output, analysisId: config.id });

  // Step 2: Document 2 extraction
  onStep?.({ name: `${stepPrefix} Dokument 2`, status: 'running', analysisId: config.id });
  const doc2Output = await searchAndExtract(vs2, config.searchQueries[1] || config.searchQueries[0], config.extractionInstruction);
  onStep?.({ name: `${stepPrefix} Dokument 2`, status: 'completed', output: doc2Output, analysisId: config.id });

  // Step 3: Search across all additional vector stores
  onStep?.({ name: `${stepPrefix} Dokument 3`, status: 'running', analysisId: config.id });
  // Use a third store if available, otherwise re-query vs2 with different query
  const vs3 = storeIds.length > 2 ? storeIds[2] : vs2;
  const doc3Output = await searchAndExtract(vs3, config.searchQueries[2] || config.searchQueries[0], config.extractionInstruction);
  onStep?.({ name: `${stepPrefix} Dokument 3`, status: 'completed', output: doc3Output, analysisId: config.id });

  // Step 4: Run orchestrator
  onStep?.({ name: `${stepPrefix} Porovnanie`, status: 'running', analysisId: config.id });
  const orchestratorInput = `Výsledky z dokumentov:
Dokument 1: ${doc1Output}
Dokument 2: ${doc2Output}
Dokument 3: ${doc3Output}

Posúď, či sa hodnoty zhodujú.`;

  const orchestratorOutput = await chat(config.orchestratorPrompt, orchestratorInput);
  onStep?.({ name: `${stepPrefix} Porovnanie`, status: 'completed', output: orchestratorOutput, analysisId: config.id });

  // Step 5: Classify result
  onStep?.({ name: `${stepPrefix} Klasifikácia`, status: 'running', analysisId: config.id });
  const category = await classifyResult(orchestratorOutput);
  onStep?.({ name: `${stepPrefix} Klasifikácia`, status: 'completed', output: category, analysisId: config.id });

  // Calculate results
  const docs = [doc1Output, doc2Output, doc3Output];
  const confidence = config.confidenceCalculator(docs, orchestratorOutput);
  const value = config.valueExtractor(docs);

  // Get final output
  let finalOutput = "";
  if (category === "zhoda") {
    finalOutput = `Dokumenty sa zhodujú: ${value}`;
  } else {
    finalOutput = await chat(
      "Opíš zistený problém s korešpondenciou medzi dokumentmi. Odpovedz stručne po slovensky.",
      `Hľadaná hodnota: ${config.name}\nDokumenty uvádzajú:\n${doc1Output}\n${doc2Output}\n${doc3Output}`
    );
  }

  const note = category === "zhoda"
    ? "Zhoda - Dokumenty sa zhodujú"
    : "Problém s korešpondenciou";
  const noteType = category === "zhoda" ? "zhoda" : "problem";

  return {
    name: config.name,
    value,
    confidence,
    note,
    noteType,
    details: {
      doc1: doc1Output,
      doc2: doc2Output,
      doc3: doc3Output,
      orchestrator: orchestratorOutput,
      category,
      finalOutput
    }
  };
}

// Main workflow function - runs all analyses
export const runWorkflow = async (
  workflow: WorkflowInput,
  onStep?: StepCallback
): Promise<WorkflowResult[]> => {
  console.log("[Workflow] Starting workflow with input:", workflow.input_as_text);

  const results: WorkflowResult[] = [];

  // Run each analysis sequentially
  for (const config of ANALYSIS_CONFIGS) {
    console.log(`[Workflow] Starting analysis: ${config.name}`);
    const result = await runSingleAnalysis(config, onStep);
    results.push(result);
    console.log(`[Workflow] Completed analysis: ${config.name}`, result);
  }

  return results;
};
