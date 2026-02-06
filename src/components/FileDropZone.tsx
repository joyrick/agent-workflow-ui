'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Loader2, Check } from 'lucide-react';

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => Promise<void>;
  isUploading: boolean;
  children: React.ReactNode;
}

export function FileDropZone({ onFilesDropped, isUploading, children }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await onFilesDropped(files);
      }
    },
    [onFilesDropped]
  );

  return (
    <div
      className="relative flex-1 flex flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary-50/90 backdrop-blur-sm border-2 border-dashed border-primary-400 rounded-xl m-2 transition-all">
          <div className="text-center">
            <Upload size={48} className="mx-auto mb-3 text-primary-500" />
            <p className="text-lg font-medium text-primary-700">
              Pustite súbory pre nahranie
            </p>
            <p className="text-sm text-primary-500 mt-1">
              Dokumenty budú pridané do znalostnej bázy
            </p>
          </div>
        </div>
      )}

      {/* Upload toast */}
      {isUploading && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-primary-200">
          <Loader2 size={16} className="animate-spin text-primary-600" />
          <span className="text-sm text-primary-700">Nahrávam dokumenty...</span>
        </div>
      )}
    </div>
  );
}
