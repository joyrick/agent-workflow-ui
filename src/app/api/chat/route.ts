import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

const SYSTEM_PROMPT = `Si odborný asistent pre stavebné povolenia na Slovensku. Pomáhaš používateľom s otázkami o stavebnom konaní, dokumentácii, legislatíve a procesoch súvisiacich so stavebnými povoleniami.

Máš k dispozícii nástroj "analyze_documents", ktorý spustí automatickú analýzu nahraných dokumentov. Tento nástroj porovná údaje z rôznych dokumentov (napr. počet podlaží, parkovacie miesta) a zistí, či sa zhodujú.

PRAVIDLÁ:
- Ak používateľ požiada o analýzu dokumentov, kontrolu zhody, overenie údajov, alebo spomína "bilančnú tabuľku", "kontrolu dokumentov", "analýzu" a pod., použi nástroj analyze_documents.
- Ak sa používateľ pýta všeobecnú otázku o stavebnom povolení, odpovedz priamo bez použitia nástroja.
- Odpovedaj vždy po slovensky.
- Buď stručný, ale informatívny.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'analyze_documents',
      description: 'Spustí automatickú analýzu nahraných dokumentov. Porovná údaje z rôznych dokumentov (počet podlaží, parkovacie miesta a pod.) a zistí, či sa zhodujú. Použi tento nástroj keď používateľ chce skontrolovať, analyzovať alebo overiť dokumenty.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Krátky dôvod prečo sa spúšťa analýza',
          },
        },
        required: ['reason'],
      },
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages: chatHistory } = body;

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return new Response(
        JSON.stringify({ error: 'Správy sú povinné' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build messages for OpenAI
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Call OpenAI with tools
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: openaiMessages,
      tools: TOOLS,
      temperature: 0.3,
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Check if the model wants to call a tool
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0] as any;
      
      if (toolCall.function?.name === 'analyze_documents') {
        const args = JSON.parse(toolCall.function.arguments);
        
        // Return a response indicating workflow should be triggered
        return new Response(
          JSON.stringify({
            type: 'tool_call',
            tool: 'analyze_documents',
            reason: args.reason,
            // Also include a message the assistant wants to say before running the tool
            preMessage: `Spúšťam analýzu dokumentov: ${args.reason}`,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Regular chat response
    return new Response(
      JSON.stringify({
        type: 'message',
        content: message.content || 'Prepáčte, nepodarilo sa mi vygenerovať odpoveď.',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Neznáma chyba' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
