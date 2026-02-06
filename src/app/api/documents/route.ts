import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import {
  getVectorStores,
  addVectorStore,
  addDocumentToStore,
  updateDocumentStatus,
  toggleStoreEnabled,
  toggleDocumentEnabled,
  removeDocument,
  removeVectorStore,
  type VectorStoreInfo,
} from '@/lib/documentStore';

const openai = new OpenAI();

// GET - list all vector stores and their documents
export async function GET() {
  try {
    const stores = getVectorStores();
    return new Response(JSON.stringify(stores), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new Response(
      JSON.stringify({ error: 'Nepodarilo sa načítať dokumenty' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST - upload files and add them to a vector store
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    let targetStoreId = formData.get('storeId') as string | null;

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Žiadne súbory neboli nahrané' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If no target store specified, create a new one
    if (!targetStoreId) {
      const newStoreId = `vs-custom-${Date.now()}`;
      const vectorStore = await openai.vectorStores.create({
        name: `Nahraté dokumenty - ${new Date().toLocaleDateString('sk-SK')}`,
      });

      const newStore: VectorStoreInfo = {
        id: newStoreId,
        name: `Nahraté dokumenty`,
        description: `Dokumenty nahrané ${new Date().toLocaleDateString('sk-SK')}`,
        vectorStoreId: vectorStore.id,
        documents: [],
        isDefault: false,
        enabled: true,
      };

      addVectorStore(newStore);
      targetStoreId = newStoreId;
    }

    const stores = getVectorStores();
    const targetStore = stores.find(s => s.id === targetStoreId);

    if (!targetStore) {
      return new Response(
        JSON.stringify({ error: 'Cieľový vector store nebol nájdený' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const uploadedDocs = [];

    for (const file of files) {
      const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add document placeholder
      addDocumentToStore(targetStoreId, {
        id: docId,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'uploading',
        enabled: true,
      });

      try {
        // Upload file to OpenAI
        const openaiFile = await openai.files.create({
          file: file,
          purpose: 'assistants',
        });

        updateDocumentStatus(targetStoreId, docId, 'processing', openaiFile.id);

        // Add file to vector store
        await openai.vectorStores.files.create(targetStore.vectorStoreId, {
          file_id: openaiFile.id,
        });

        updateDocumentStatus(targetStoreId, docId, 'ready', openaiFile.id);

        uploadedDocs.push({
          id: docId,
          name: file.name,
          status: 'ready',
        });
      } catch (uploadError) {
        console.error(`Error uploading file ${file.name}:`, uploadError);
        updateDocumentStatus(targetStoreId, docId, 'error');
        uploadedDocs.push({
          id: docId,
          name: file.name,
          status: 'error',
        });
      }
    }

    // Return updated stores
    const updatedStores = getVectorStores();

    return new Response(
      JSON.stringify({
        message: `Nahraných ${uploadedDocs.filter(d => d.status === 'ready').length} z ${files.length} súborov`,
        documents: uploadedDocs,
        stores: updatedStores,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Chyba pri nahrávaní' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PATCH - toggle enabled state for a store or document
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, docId } = body;

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'storeId je povinný' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let success: boolean;
    if (docId) {
      // Toggle document
      success = toggleDocumentEnabled(storeId, docId);
    } else {
      // Toggle entire store
      success = toggleStoreEnabled(storeId);
    }

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Položka nebola nájdená' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stores = getVectorStores();
    return new Response(JSON.stringify(stores), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Toggle error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Neznáma chyba' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE - remove a store or document
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, docId } = body;

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'storeId je povinný' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let success: boolean;
    if (docId) {
      // Delete a single document
      success = removeDocument(storeId, docId);
    } else {
      // Delete entire vector store
      success = removeVectorStore(storeId);
    }

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Položka nebola nájdená' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stores = getVectorStores();
    return new Response(JSON.stringify(stores), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Neznáma chyba' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
