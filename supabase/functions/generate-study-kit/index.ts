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

const SYSTEM_PROMPT = `You are an AI assistant that transforms lecture transcripts into a complete "Study Kit" for active revision.
Given the input lecture text, perform the following tasks:

1. Summarizer: Generate structured notes using the Cornell Method with Key Points, Supporting Details, and a Summary.
2. Flashcard Engine: Extract atomic facts as Question/Answer pairs. Do not invent facts.
3. Visual Mapper: Output valid Mermaid.js mindmap code with concise node labels (1-3 words).
4. Contextual Bot: Chunk text into ~500 token segments with chunk_id and content.

Constraints:
- Never hallucinate or guess missing information.
- Keep outputs clean, structured, and ready for direct use.

Respond with valid JSON in this exact format:
{
  "cornell_notes": {"keyPoints": [{"point": "string", "details": "string"}], "summary": "string"},
  "flashcards": [{"question": "string", "answer": "string"}],
  "mindmap": "string",
  "chunks": [{"chunk_id": number, "content": "string"}]
}`;

async function generateWithAI(transcript: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nInput Lecture: ${transcript}`
        }]
      }]
    }),
  });

  if (!response.ok) {
    throw new Error('AI generation failed');
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
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

    const generated = await generateWithAI(transcript);

    const data = {
      title: title || 'Untitled Lecture',
      ...generated,
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
