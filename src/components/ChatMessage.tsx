'use client';

import Image from 'next/image';
import { User, Loader2 } from 'lucide-react';

interface ChatMessageProps {
  type: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export function ChatMessage({ type, content, isLoading }: ChatMessageProps) {
  const isUser = type === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {isUser ? (
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-md">
          <User size={20} />
        </div>
      ) : (
        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-800 shadow-md flex items-center justify-center">
          <Image
            src="/logo_biele_bez_gradientu.png"
            alt="Povolean"
            width={21}
            height={21}
            opacity={0.4}
            className="object-contain"
          />
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-gray-800 text-white rounded-tr-none'
            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin text-primary-500" />
            <span className="text-gray-500">{content}</span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  );
}
