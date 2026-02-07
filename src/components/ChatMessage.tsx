'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { User, Loader2 } from 'lucide-react';

function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const initialTextRef = useRef(text);

  useEffect(() => {
    // Only animate if this is the first render with this text
    // (i.e., the message just appeared)
    if (initialTextRef.current !== text) {
      // Content changed after initial mount — show immediately
      setDisplayedText(text);
      setIsDone(true);
      return;
    }

    let index = 0;
    setDisplayedText('');
    setIsDone(false);

    const interval = setInterval(() => {
      index++;
      setDisplayedText(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(interval);
        setIsDone(true);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <p className="whitespace-pre-wrap">
      {displayedText}
      {!isDone && <span className="inline-block w-[2px] h-[1em] bg-gray-400 ml-0.5 animate-pulse align-text-bottom" />}
    </p>
  );
}

interface ChatMessageProps {
  type: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  animate?: boolean;
}

export function ChatMessage({ type, content, isLoading, animate = true }: ChatMessageProps) {
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
            className="object-contain opacity-85"
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
          isUser || !animate ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <TypewriterText text={content} />
          )
        )}
      </div>
    </div>
  );
}
