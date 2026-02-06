/**
 * Document Store Registry
 * 
 * Manages vector stores and their documents.
 * Pre-populated with existing vector stores, and supports
 * adding new documents dynamically via drag & drop.
 */

export interface DocumentInfo {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  openaiFileId?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  enabled: boolean;
}

export interface VectorStoreInfo {
  id: string;
  name: string;
  description: string;
  vectorStoreId: string;
  documents: DocumentInfo[];
  isDefault: boolean;
  enabled: boolean;
}

// In-memory store (in production, this would be a database)
let vectorStores: VectorStoreInfo[] = [
  {
    id: 'vs-1',
    name: 'Projektová dokumentácia',
    description: 'Hlavná projektová dokumentácia stavby',
    vectorStoreId: 'vs_697e524aef9c819182db0e8bbfc98456',
    documents: [
      {
        id: 'doc-1-default',
        name: 'Projektová dokumentácia (predindexovaný)',
        size: 0,
        uploadedAt: '2026-01-01T00:00:00Z',
        status: 'ready',
        enabled: true,
      },
    ],
    isDefault: true,
    enabled: true,
  },
  {
    id: 'vs-2',
    name: 'Stavebné povolenie',
    description: 'Dokumenty stavebného povolenia a rozhodnutia',
    vectorStoreId: 'vs_697e529683e081919d31a8ab7a2bc02a',
    documents: [
      {
        id: 'doc-2-default',
        name: 'Stavebné povolenie (predindexovaný)',
        size: 0,
        uploadedAt: '2026-01-01T00:00:00Z',
        status: 'ready',
        enabled: true,
      },
    ],
    isDefault: true,
    enabled: true,
  },
];

export function getVectorStores(): VectorStoreInfo[] {
  return vectorStores;
}

export function getVectorStoreIds(): string[] {
  return vectorStores
    .filter(vs => vs.enabled)
    .map(vs => vs.vectorStoreId);
}

export function addVectorStore(store: VectorStoreInfo): void {
  vectorStores.push(store);
}

export function addDocumentToStore(storeId: string, doc: DocumentInfo): void {
  const store = vectorStores.find(vs => vs.id === storeId);
  if (store) {
    store.documents.push(doc);
  }
}

export function updateDocumentStatus(
  storeId: string,
  docId: string,
  status: DocumentInfo['status'],
  openaiFileId?: string
): void {
  const store = vectorStores.find(vs => vs.id === storeId);
  if (store) {
    const doc = store.documents.find(d => d.id === docId);
    if (doc) {
      doc.status = status;
      if (openaiFileId) doc.openaiFileId = openaiFileId;
    }
  }
}

export function toggleStoreEnabled(storeId: string): boolean {
  const store = vectorStores.find(vs => vs.id === storeId);
  if (store) {
    store.enabled = !store.enabled;
    return true;
  }
  return false;
}

export function toggleDocumentEnabled(storeId: string, docId: string): boolean {
  const store = vectorStores.find(vs => vs.id === storeId);
  if (store) {
    const doc = store.documents.find(d => d.id === docId);
    if (doc) {
      doc.enabled = !doc.enabled;
      return true;
    }
  }
  return false;
}

export function removeDocument(storeId: string, docId: string): boolean {
  const store = vectorStores.find(vs => vs.id === storeId);
  if (store) {
    const idx = store.documents.findIndex(d => d.id === docId);
    if (idx !== -1) {
      store.documents.splice(idx, 1);
      return true;
    }
  }
  return false;
}

export function removeVectorStore(storeId: string): boolean {
  const idx = vectorStores.findIndex(vs => vs.id === storeId);
  if (idx !== -1) {
    vectorStores.splice(idx, 1);
    return true;
  }
  return false;
}
