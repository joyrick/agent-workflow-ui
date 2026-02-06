'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChatInput } from '@/components/ChatInput';
import { ChatMessage } from '@/components/ChatMessage';
import { WorkflowResult } from '@/components/WorkflowResult';
import { WorkflowProgress } from '@/components/WorkflowProgress';
import { DocumentHierarchy } from '@/components/DocumentHierarchy';
import { FileDropZone } from '@/components/FileDropZone';
import { MessageSquare, FolderOpen } from 'lucide-react';

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

interface VectorStoreInfo {
  id: string;
  name: string;
  description: string;
  vectorStoreId: string;
  documents: {
    id: string;
    name: string;
    size: number;
    uploadedAt: string;
    openaiFileId?: string;
    status: 'uploading' | 'processing' | 'ready' | 'error';
    enabled: boolean;
  }[];
  isDefault: boolean;
  enabled: boolean;
}

type TabType = 'chat' | 'documents';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [vectorStores, setVectorStores] = useState<VectorStoreInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch document stores on mount
  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setVectorStores(data);
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Handle file upload (from drag & drop)
  const handleFileUpload = useCallback(async (files: File[], storeId?: string) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (storeId) formData.append('storeId', storeId);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setVectorStores(data.stores);

        // Add a system message to chat
        const uploadMsg: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `📄 ${data.message}. Dokumenty sú teraz dostupné pre analýzu.`,
        };
        setMessages(prev => [...prev, uploadMsg]);
        setChatHistory(prev => [
          ...prev,
          { role: 'assistant', content: `Používateľ nahral dokumenty: ${files.map(f => f.name).join(', ')}. ${data.message}` },
        ]);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Chyba pri nahrávaní');
      }
    } catch (error) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Chyba pri nahrávaní: ${error instanceof Error ? error.message : 'Neznáma chyba'}`,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Toggle a vector store on/off from knowledge
  const handleToggleStore = useCallback(async (storeId: string) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      if (res.ok) {
        const stores = await res.json();
        setVectorStores(stores);
      }
    } catch (error) {
      console.error('Toggle store error:', error);
    }
  }, []);

  // Toggle a document on/off from knowledge
  const handleToggleDocument = useCallback(async (storeId: string, docId: string) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, docId }),
      });
      if (res.ok) {
        const stores = await res.json();
        setVectorStores(stores);
      }
    } catch (error) {
      console.error('Toggle document error:', error);
    }
  }, []);

  // Delete a vector store
  const handleDeleteStore = useCallback(async (storeId: string) => {
    if (!confirm('Naozaj chcete odstrániť toto úložisko a všetky jeho dokumenty?')) return;
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      if (res.ok) {
        const stores = await res.json();
        setVectorStores(stores);
      }
    } catch (error) {
      console.error('Delete store error:', error);
    }
  }, []);

  // Delete a document
  const handleDeleteDocument = useCallback(async (storeId: string, docId: string) => {
    if (!confirm('Naozaj chcete odstrániť tento dokument?')) return;
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, docId }),
      });
      if (res.ok) {
        const stores = await res.json();
        setVectorStores(stores);
      }
    } catch (error) {
      console.error('Delete document error:', error);
    }
  }, []);

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
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
          <Image
            src="/logo_biele_bez_gradientu.png"
            alt="Povolean"
            width={22}
            height={22}
            className="object-contain"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">
            Stavebné povolenie
          </h1>
          <p className="text-sm text-gray-500">
            Asistent pre stavebné konanie a analýzu dokumentov
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'chat'
              ? 'text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare size={16} />
          Chat
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'documents'
              ? 'text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FolderOpen size={16} />
          Hierarchia dokumentov
          {vectorStores.reduce((sum, s) => sum + s.documents.length, 0) > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-primary-100 text-primary-700 rounded-full">
              {vectorStores.reduce((sum, s) => sum + s.documents.length, 0)}
            </span>
          )}
          {activeTab === 'documents' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' ? (
        <FileDropZone onFilesDropped={handleFileUpload} isUploading={isUploading}>
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
                <p className="text-gray-400 text-sm mt-3">
                  Pretiahnite súbory do chatu pre pridanie dokumentov
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
        </FileDropZone>
      ) : (
        <DocumentHierarchy
          stores={vectorStores}
          onUpload={handleFileUpload}
          onToggleStore={handleToggleStore}
          onToggleDocument={handleToggleDocument}
          onDeleteStore={handleDeleteStore}
          onDeleteDocument={handleDeleteDocument}
          isUploading={isUploading}
        />
      )}
    </main>
  );
}
