import { NextRequest } from 'next/server';
import { runWorkflow } from '@/lib/workflow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Vstupný text je povinný' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper to send SSE data
    const sendEvent = async (event: string, data: any) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    };

    // Run workflow in background and stream updates
    (async () => {
      try {
        const result = await runWorkflow(
          { input_as_text: input },
          async (step) => {
            await sendEvent('step', step);
          }
        );
        
        await sendEvent('result', result);
        await sendEvent('done', {});
      } catch (error) {
        await sendEvent('error', { 
          message: error instanceof Error ? error.message : 'Neznáma chyba' 
        });
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Workflow error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Neznáma chyba pri spracovaní workflow' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
