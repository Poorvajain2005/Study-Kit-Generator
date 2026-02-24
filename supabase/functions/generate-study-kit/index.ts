import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  transcript: string;
  title?: string;
}

function generateCornellNotes(transcript: string) {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const keyPoints = [];

  for (let i = 0; i < Math.min(5, Math.floor(sentences.length / 2)); i++) {
    const point = sentences[i * 2]?.trim();
    const detail = sentences[i * 2 + 1]?.trim() || sentences[i * 2]?.trim();
    if (point) {
      keyPoints.push({
        point: point.substring(0, 50) + (point.length > 50 ? '...' : ''),
        details: detail.substring(0, 200)
      });
    }
  }

  return {
    keyPoints,
    summary: transcript.substring(0, 300) + (transcript.length > 300 ? '...' : '')
  };
}

function generateFlashcards(transcript: string) {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const flashcards = [];

  for (let i = 0; i < Math.min(10, sentences.length); i++) {
    const sentence = sentences[i]?.trim();
    if (sentence && sentence.length > 20) {
      const words = sentence.split(' ');
      const question = `What is ${words.slice(0, 5).join(' ')}?`;
      const answer = sentence;
      flashcards.push({ question, answer });
    }
  }

  return flashcards;
}

function generateMindmap(transcript: string) {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let mindmap = 'mindmap\n  root((Lecture))\n';

  for (let i = 0; i < Math.min(4, sentences.length); i++) {
    const words = sentences[i]?.trim().split(' ').slice(0, 3).join(' ');
    if (words) {
      mindmap += `    ${words}\n`;
    }
  }

  return mindmap;
}

function generateChunks(transcript: string) {
  const chunkSize = 500;
  const chunks = [];
  const words = transcript.split(' ');

  let chunkId = 1;
  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push({
      chunk_id: chunkId++,
      content: chunk
    });
  }

  return chunks;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { transcript, title }: RequestBody = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const cornellNotes = generateCornellNotes(transcript);
    const flashcards = generateFlashcards(transcript);
    const mindmap = generateMindmap(transcript);
    const chunks = generateChunks(transcript);

    const data = {
      title: title || 'Untitled Lecture',
      cornell_notes: cornellNotes,
      flashcards,
      mindmap,
      chunks,
    };

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
