'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage } from '@/components/ChatMessage';
import { WorkflowResult } from '@/components/WorkflowResult';
import { WorkflowProgress } from '@/components/WorkflowProgress';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'workflow';
  content: string;
  results?: WorkflowResultData[];
  steps?: WorkflowStep[];
  isLoading?: boolean;
}

export interface WorkflowStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: string;
  analysisId?: string;
}

export interface WorkflowResultData {
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

// Chat history for OpenAI context
interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Run the document analysis workflow
  const runAnalysisWorkflow = async (assistantMessageId: string) => {
    // Set up initial steps
    const initialSteps: WorkflowStep[] = [
      { name: '[Počet podlaží] Dokument 1', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet podlaží] Dokument 2', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet podlaží] Dokument 3', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet podlaží] Porovnanie', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet podlaží] Klasifikácia', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet parkovacích miest] Dokument 1', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
      { name: '[Počet parkovacích miest] Dokument 2', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
      { name: '[Počet parkovacích miest] Dokument 3', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
      { name: '[Počet parkovacích miest] Porovnanie', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
      { name: '[Počet parkovacích miest] Klasifikácia', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
    ];

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMessageId
          ? { ...msg, steps: initialSteps }
          : msg
      )
    );

    const response = await fetch('/api/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'analyze' }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Chyba pri spracovaní');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Nie je možné čítať odpoveď');
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) continue;
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6);
          try {
            const data = JSON.parse(dataStr);

            if (data.name && data.status) {
              // Step update
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== assistantMessageId) return msg;
                  const stepExists = msg.steps?.some(s => s.name === data.name);
                  let updatedSteps: WorkflowStep[];
                  if (stepExists) {
                    updatedSteps = msg.steps?.map((step) =>
                      step.name === data.name
                        ? { ...step, status: data.status, output: data.output, analysisId: data.analysisId }
                        : step
                    ) || [];
                  } else {
                    updatedSteps = [
                      ...(msg.steps || []),
                      { name: data.name, status: data.status, output: data.output, analysisId: data.analysisId },
                    ];
                  }
                  return { ...msg, steps: updatedSteps };
                })
              );
            } else if (Array.isArray(data)) {
              // Results
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, isLoading: false, content: 'Analýza dokončená', results: data }
                    : msg
                )
              );
              // Add to chat history
              setChatHistory((prev) => [
                ...prev,
                { role: 'assistant', content: `Analýza dokončená. Výsledky: ${JSON.stringify(data.map((r: any) => ({ name: r.name, value: r.value, note: r.note })))}` },
              ]);
            } else if (data.message) {
              throw new Error(data.message);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: 'Premýšľam...',
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsProcessing(true);

    // Add user message to chat history
    const updatedHistory = [...chatHistory, { role: 'user' as const, content }];
    setChatHistory(updatedHistory);

    try {
      // Step 1: Ask the chat agent what to do
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory }),
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.json();
        throw new Error(errorData.error || 'Chyba pri spracovaní');
      }

      const chatData = await chatResponse.json();

      if (chatData.type === 'tool_call' && chatData.tool === 'analyze_documents') {
        // Agent decided to run analysis
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, type: 'workflow' as const, content: chatData.preMessage, isLoading: true }
              : msg
          )
        );

        await runAnalysisWorkflow(assistantMessageId);
      } else {
        // Regular chat response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isLoading: false, content: chatData.content }
              : msg
          )
        );

        // Add assistant response to chat history
        setChatHistory((prev) => [
          ...prev,
          { role: 'assistant', content: chatData.content },
        ]);
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isLoading: false,
                content: `Chyba: ${error instanceof Error ? error.message : 'Neznáma chyba'}`,
                steps: msg.steps?.map((step) => ({
                  ...step,
                  status: step.status === 'running' ? 'error' as const : step.status,
                })),
              }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Stavebné povolenie
          </h1>
          <p className="text-sm text-gray-500">
            Asistent pre stavebné konanie a analýzu dokumentov
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-xl font-medium text-gray-800 mb-2">
              Vitajte
            </h2>
            <p className="text-gray-500 max-w-md">
              Som váš asistent pre stavebné povolenia. Môžete sa ma opýtať na čokoľvek
              ohľadom stavebného konania, alebo ma požiadať o analýzu nahraných dokumentov.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="animate-slide-in">
            {message.type === 'user' ? (
              <ChatMessage type="user" content={message.content} />
            ) : (
              <div className="space-y-4">
                <ChatMessage
                  type="assistant"
                  content={message.content}
                  isLoading={message.isLoading}
                />
                {message.isLoading && message.steps && (
                  <WorkflowProgress steps={message.steps} />
                )}
                {!message.isLoading && message.results && message.results.length > 0 && (
                  <WorkflowResult results={message.results} />
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-6 py-4">
        <ChatInput onSend={handleSendMessage} disabled={isProcessing} />
      </div>
    </main>
  );
}
