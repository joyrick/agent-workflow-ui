'use client';

import { useState, useCallback } from 'react';
import {
  Database,
  FileText,
  ChevronDown,
  ChevronRight,
  Upload,
  Check,
  Loader2,
  AlertCircle,
  FolderOpen,
  HardDrive,
  Trash2,
} from 'lucide-react';

interface DocumentInfo {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  openaiFileId?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  enabled: boolean;
}

interface VectorStoreInfo {
  id: string;
  name: string;
  description: string;
  vectorStoreId: string;
  documents: DocumentInfo[];
  isDefault: boolean;
  enabled: boolean;
}

interface DocumentHierarchyProps {
  stores: VectorStoreInfo[];
  onUpload: (files: File[], storeId?: string) => Promise<void>;
  onToggleStore: (storeId: string) => Promise<void>;
  onToggleDocument: (storeId: string, docId: string) => Promise<void>;
  onDeleteStore: (storeId: string) => Promise<void>;
  onDeleteDocument: (storeId: string, docId: string) => Promise<void>;
  isUploading: boolean;
}

function StatusIcon({ status }: { status: DocumentInfo['status'] }) {
  switch (status) {
    case 'uploading':
      return <Loader2 size={14} className="animate-spin text-blue-500" />;
    case 'processing':
      return <Loader2 size={14} className="animate-spin text-yellow-500" />;
    case 'ready':
      return <Check size={14} className="text-green-500" />;
    case 'error':
      return <AlertCircle size={14} className="text-red-500" />;
  }
}

function StatusLabel({ status }: { status: DocumentInfo['status'] }) {
  const labels: Record<DocumentInfo['status'], string> = {
    uploading: 'Nahráva sa...',
    processing: 'Indexuje sa...',
    ready: 'Pripravený',
    error: 'Chyba',
  };
  const colors: Record<DocumentInfo['status'], string> = {
    uploading: 'text-blue-600',
    processing: 'text-yellow-600',
    ready: 'text-green-600',
    error: 'text-red-600',
  };
  return (
    <span className={`text-xs ${colors[status]}`}>{labels[status]}</span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function ToggleSwitch({ enabled, onChange, size = 'md' }: { enabled: boolean; onChange: () => void; size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm'
    ? 'w-8 h-[18px]'
    : 'w-10 h-[22px]';
  const dotSize = size === 'sm'
    ? 'w-3.5 h-3.5'
    : 'w-4 h-4';
  const dotTranslate = size === 'sm'
    ? (enabled ? 'translate-x-[14px]' : 'translate-x-[2px]')
    : (enabled ? 'translate-x-[20px]' : 'translate-x-[2px]');

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`relative inline-flex items-center rounded-full transition-colors duration-200 ${dimensions} ${
        enabled ? 'bg-primary-500' : 'bg-gray-300'
      }`}
      title={enabled ? 'Aktívny v znalostnej báze' : 'Neaktívny v znalostnej báze'}
    >
      <span
        className={`inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ${dotSize} ${dotTranslate}`}
      />
    </button>
  );
}

function VectorStoreCard({
  store,
  onUpload,
  onToggleStore,
  onToggleDocument,
  onDeleteStore,
  onDeleteDocument,
  isUploading,
}: {
  store: VectorStoreInfo;
  onUpload: (files: File[], storeId: string) => Promise<void>;
  onToggleStore: (storeId: string) => Promise<void>;
  onToggleDocument: (storeId: string, docId: string) => Promise<void>;
  onDeleteStore: (storeId: string) => Promise<void>;
  onDeleteDocument: (storeId: string, docId: string) => Promise<void>;
  isUploading: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await onUpload(files, store.id);
      }
    },
    [onUpload, store.id]
  );

  const readyCount = store.documents.filter(d => d.status === 'ready').length;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        isDragOver
          ? 'border-primary-400 bg-primary-50 shadow-lg shadow-primary-100'
          : 'border-gray-200 bg-white'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Store Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-t-xl transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`p-1.5 rounded-lg ${store.enabled ? 'bg-primary-100' : 'bg-gray-100'}`}>
          <Database size={16} className={store.enabled ? 'text-primary-600' : 'text-gray-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm truncate ${store.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
              {store.name}
            </span>
            {store.isDefault && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary-100 text-primary-700 rounded-full">
                Predvolený
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{store.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleSwitch
            enabled={store.enabled}
            onChange={() => onToggleStore(store.id)}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteStore(store.id); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Odstrániť úložisko"
          >
            <Trash2 size={14} />
          </button>
          <span className="text-xs text-gray-400">
            {readyCount} {readyCount === 1 ? 'dokument' : readyCount < 5 ? 'dokumenty' : 'dokumentov'}
          </span>
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Documents List */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {store.documents.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {store.documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                    !doc.enabled ? 'opacity-50' : ''
                  }`}
                >
                  <FileText size={14} className="text-gray-400 flex-shrink-0" />
                  <span className={`text-sm flex-1 truncate ${doc.enabled ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                    {doc.name}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatFileSize(doc.size)}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StatusIcon status={doc.status} />
                    <StatusLabel status={doc.status} />
                  </div>
                  <ToggleSwitch
                    enabled={doc.enabled}
                    onChange={() => onToggleDocument(store.id, doc.id)}
                    size="sm"
                  />
                  <button
                    onClick={() => onDeleteDocument(store.id, doc.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Odstrániť dokument"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Žiadne dokumenty
            </div>
          )}

          {/* Drop zone hint */}
          <div
            className={`mx-3 mb-3 mt-1 rounded-lg border-2 border-dashed p-3 text-center transition-all ${
              isDragOver
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Upload
              size={16}
              className={`mx-auto mb-1 ${isDragOver ? 'text-primary-500' : 'text-gray-400'}`}
            />
            <p className="text-xs text-gray-500">
              Pretiahnite súbory sem
            </p>
          </div>
        </div>
      )}

      {/* Vector Store ID */}
      <div className="px-4 py-2 bg-gray-50 rounded-b-xl border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <HardDrive size={12} className="text-gray-400" />
          <span className="text-[10px] font-mono text-gray-400 truncate">
            {store.vectorStoreId}
          </span>
        </div>
      </div>
    </div>
  );
}

export function DocumentHierarchy({ stores, onUpload, onToggleStore, onToggleDocument, onDeleteStore, onDeleteDocument, isUploading }: DocumentHierarchyProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleGlobalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleGlobalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleGlobalDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        // Drop without specific store → create a new one
        await onUpload(files);
      }
    },
    [onUpload]
  );

  const totalDocs = stores.reduce((sum, s) => sum + s.documents.length, 0);
  const readyDocs = stores.reduce(
    (sum, s) => sum + s.documents.filter(d => d.status === 'ready').length,
    0
  );

  return (
    <div className="h-full flex flex-col">
      {/* Summary Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-primary-600" />
            <h3 className="font-medium text-gray-900">Hierarchia dokumentov</h3>
          </div>
          <div className="text-xs text-gray-500">
            {stores.length} {stores.length === 1 ? 'úložisko' : 'úložiská'} · {readyDocs}/{totalDocs} dokumentov
          </div>
        </div>
      </div>

      {/* Stores List */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onDragOver={handleGlobalDragOver}
        onDragLeave={handleGlobalDragLeave}
        onDrop={handleGlobalDrop}
      >
        {stores.map((store) => (
          <VectorStoreCard
            key={store.id}
            store={store}
            onUpload={onUpload}
            onToggleStore={onToggleStore}
            onToggleDocument={onToggleDocument}
            onDeleteStore={onDeleteStore}
            onDeleteDocument={onDeleteDocument}
            isUploading={isUploading}
          />
        ))}

        {/* Global Drop Zone for new vector store */}
        <div
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Upload
            size={24}
            className={`mx-auto mb-2 ${isDragOver ? 'text-primary-500' : 'text-gray-400'}`}
          />
          <p className={`text-sm font-medium ${isDragOver ? 'text-primary-700' : 'text-gray-600'}`}>
            {isDragOver ? 'Pustite súbory pre vytvorenie nového úložiska' : 'Pretiahnite dokumenty sem'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Vytvorí sa nové vektorové úložisko
          </p>
        </div>
      </div>

      {/* Upload indicator */}
      {isUploading && (
        <div className="px-4 py-3 bg-primary-50 border-t border-primary-100 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-primary-600" />
          <span className="text-sm text-primary-700">Nahrávam dokumenty...</span>
        </div>
      )}
    </div>
  );
}
