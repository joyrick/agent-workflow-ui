'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage } from '@/components/ChatMessage';
import { WorkflowResult } from '@/components/WorkflowResult';
import { WorkflowProgress } from '@/components/WorkflowProgress';
import { Building2 } from 'lucide-react';

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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    
    // Initial steps for both analyses
    const initialSteps: WorkflowStep[] = [
      // Počet podlaží steps
      { name: '[Počet podlaží] Dokument 1', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet podlaží] Dokument 2', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet podlaží] Dokument 3', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet podlaží] Porovnanie', status: 'pending', analysisId: 'pocet_podlazi' },
      { name: '[Počet podlaží] Klasifikácia', status: 'pending', analysisId: 'pocet_podlazi' },
      // Počet parkovacích miest steps
      { name: '[Počet parkovacích miest] Dokument 1', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
      { name: '[Počet parkovacích miest] Dokument 2', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
      { name: '[Počet parkovacích miest] Dokument 3', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
      { name: '[Počet parkovacích miest] Porovnanie', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
      { name: '[Počet parkovacích miest] Klasifikácia', status: 'pending', analysisId: 'pocet_parkovacich_miest' },
    ];

    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'workflow',
      content: 'Spracovávam vašu požiadavku...',
      isLoading: true,
      steps: initialSteps,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba pri spracovaní');
      }

      // Handle SSE stream
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
          if (line.startsWith('event: ')) {
            continue;
          }
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            try {
              const data = JSON.parse(dataStr);
              
              // Check what type of event based on data structure
              if (data.name && data.status) {
                // Step update - match by name
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id !== assistantMessageId) return msg;
                    
                    // Add new step if it doesn't exist, otherwise update
                    let stepExists = msg.steps?.some(s => s.name === data.name);
                    let updatedSteps: WorkflowStep[];
                    
                    if (stepExists) {
                      updatedSteps = msg.steps?.map((step) => {
                        if (step.name === data.name) {
                          return {
                            ...step,
                            status: data.status as 'pending' | 'running' | 'completed' | 'error',
                            output: data.output,
                            analysisId: data.analysisId,
                          };
                        }
                        return step;
                      }) || [];
                    } else {
                      // Add new step
                      updatedSteps = [
                        ...(msg.steps || []),
                        {
                          name: data.name,
                          status: data.status as 'pending' | 'running' | 'completed' | 'error',
                          output: data.output,
                          analysisId: data.analysisId,
                        }
                      ];
                    }
                    
                    return { ...msg, steps: updatedSteps };
                  })
                );
              } else if (Array.isArray(data)) {
                // Array of results
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          isLoading: false,
                          content: 'Analýza dokončená',
                          results: data,
                        }
                      : msg
                  )
                );
              } else if (data.message) {
                // Error
                throw new Error(data.message);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete data
            }
          }
        }
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
            Analýza dokumentov
          </h1>
          <p className="text-sm text-gray-500">
            Kontrola počtu podlaží a parkovacích miest
          </p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-primary-100 mb-4">
              <Building2 size={48} className="text-primary-600" />
            </div>
            <h2 className="text-xl font-medium text-gray-800 mb-2">
              Vitajte v analýze dokumentov
            </h2>
            <p className="text-gray-500 max-w-md">
              Zadajte text na analýzu a workflow automaticky extrahuje
              informácie o počte podlaží a parkovacích miest z dokumentov a vyhodnotí ich zhodu.
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
