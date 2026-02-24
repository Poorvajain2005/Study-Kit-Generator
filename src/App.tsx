import { useState } from 'react';
import { BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { CornellNotes } from './components/CornellNotes';
import { Flashcards } from './components/Flashcards';
import { Mindmap } from './components/Mindmap';
import { VectorChunks } from './components/VectorChunks';
import { StudyKit as StudyKitType } from './types';

function App() {
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [studyKit, setStudyKit] = useState<StudyKitType | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError('Please enter a lecture transcript');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-study-kit`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          title: title || 'Untitled Lecture',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate study kit');
      }

      const data = await response.json();

      const { data: lectureData, error: lectureError } = await supabase
        .from('lectures')
        .insert([
          {
            title: data.title,
            transcript,
          },
        ])
        .select()
        .single();

      if (lectureError) throw lectureError;

      const { data: kitData, error: kitError } = await supabase
        .from('study_kits')
        .insert([
          {
            lecture_id: lectureData.id,
            cornell_notes: data.cornell_notes,
            flashcards: data.flashcards,
            mindmap: data.mindmap,
            chunks: data.chunks,
          },
        ])
        .select()
        .single();

      if (kitError) throw kitError;

      setStudyKit(kitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="text-blue-600" size={40} />
            <h1 className="text-4xl font-bold text-gray-900">Study Kit Generator</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Transform lecture transcripts into structured study materials: Cornell Notes, Flashcards, Mindmaps, and Vector Chunks for embedding
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Lecture Title (optional)
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Machine Learning"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-2">
              Lecture Transcript
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste your lecture transcript here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Generating Study Kit...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Study Kit
              </>
            )}
          </button>
        </div>

        {studyKit && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CornellNotes notes={studyKit.cornell_notes} />
              <Flashcards flashcards={studyKit.flashcards} />
            </div>

            <Mindmap mindmap={studyKit.mindmap} />
            <VectorChunks chunks={studyKit.chunks} />
          </div>
        )}

        {!studyKit && !loading && (
          <div className="text-center py-12 text-gray-500">
            <p>Enter a lecture transcript above to generate your study kit</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
