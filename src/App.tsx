import { useState } from 'react';
import { BookOpen, Sparkles, Loader2, Download, FileText, Brain, MessageSquare, Zap, Award, TrendingUp, Moon, Sun } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards' | 'mindmap' | 'chunks'>('notes');
  const [progress, setProgress] = useState(0);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError('Please enter a lecture transcript');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    try {
      const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      const systemPrompt = `You are an AI assistant that transforms lecture transcripts into a complete "Study Kit" for active revision.
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Input Lecture: ${transcript}` }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate study kit');
      }

      const openaiData = await response.json();
      const text = openaiData.choices[0].message.content;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const generated = JSON.parse(jsonMatch ? jsonMatch[0] : text);

      const data = {
        title: title || 'Untitled Lecture',
        ...generated,
      };

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

      clearInterval(progressInterval);
      setProgress(100);
      setStudyKit(kitData);
      setActiveTab('notes');
      setXp(prev => prev + 50);
      setStreak(prev => prev + 1);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const exportToAnki = () => {
    if (!studyKit?.flashcards) return;
    const csv = 'Question,Answer\n' + studyKit.flashcards.map(f => `"${f.question}","${f.answer}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards.csv';
    a.click();
  };

  const openInMermaid = () => {
    if (!studyKit?.mindmap) return;
    const encoded = btoa(studyKit.mindmap);
    window.open(`https://mermaid.live/edit#base64:${encoded}`, '_blank');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50'}`}>
      {/* Progress Bar */}
      {loading && (
        <div className="fixed top-0 left-0 w-full h-1 bg-gray-800 z-50">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute right-0 top-0 p-2 glass rounded-lg hover:scale-110 transition-transform"
          >
            {darkMode ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-purple-600" size={20} />}
          </button>
          
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-3 glass rounded-xl animate-pulse-glow">
              <BookOpen className="text-blue-400" size={36} />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 bg-clip-text text-transparent animate-pulse">
              Study Kit Generator
            </h1>
          </div>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto mb-4`}>
            From Lecture to Learning in One Click ✨
          </p>
          
          {/* Gamification Stats */}
          <div className="flex justify-center gap-4 mt-4">
            <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
              <Award className="text-yellow-400" size={20} />
              <span className="text-sm font-semibold">{xp} XP</span>
            </div>
            <div className="glass px-4 py-2 rounded-lg flex items-center gap-2">
              <TrendingUp className="text-green-400" size={20} />
              <span className="text-sm font-semibold">{streak} Day Streak</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Input */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
              <h2 className="text-xl font-semibold text-transparent bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text mb-4 flex items-center gap-2">
                <Zap size={20} className="text-blue-400" />
                Input
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Lecture Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Machine Learning Basics"
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-900/50 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 transition-all duration-300 hover:scale-[1.02]`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Transcript
                  </label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your lecture transcript here..."
                    rows={12}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-900/50 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-500 transition-all duration-300`}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm animate-pulse">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 text-white rounded-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-purple-500/50 animate-pulse-glow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Generating Magic...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate Study Kit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Center Panel - Tabs */}
          <div className="lg:col-span-2">
            {studyKit ? (
              <div className="glass rounded-2xl shadow-2xl overflow-hidden hover:shadow-purple-500/20 transition-all duration-300">
                {/* Tabs */}
                <div className="flex border-b border-gray-700/50 bg-gray-900/30">
                  {[
                    { id: 'notes', icon: FileText, label: 'Notes' },
                    { id: 'flashcards', icon: Zap, label: 'Flashcards' },
                    { id: 'mindmap', icon: Brain, label: 'Mindmap' },
                    { id: 'chunks', icon: MessageSquare, label: 'Chunks' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 px-4 py-4 font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 border-b-2 border-blue-400 scale-105'
                          : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
                      }`}
                    >
                      <tab.icon size={18} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 min-h-[400px]">
                  <div className="animate-fadeIn">
                    {activeTab === 'notes' && <CornellNotes notes={studyKit.cornell_notes} />}
                    {activeTab === 'flashcards' && <Flashcards flashcards={studyKit.flashcards} />}
                    {activeTab === 'mindmap' && <Mindmap mindmap={studyKit.mindmap} />}
                    {activeTab === 'chunks' && <VectorChunks chunks={studyKit.chunks} />}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-t border-gray-700/50 bg-gray-900/30 p-4">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={exportToAnki}
                      className="px-5 py-2.5 bg-gradient-to-r from-green-500/20 to-teal-500/20 text-green-400 rounded-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 border border-green-500/50 hover:shadow-lg hover:shadow-green-500/30 font-medium"
                    >
                      <Download size={16} />
                      Export CSV
                    </button>
                    <button
                      onClick={openInMermaid}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 rounded-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 border border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/30 font-medium"
                    >
                      <Brain size={16} />
                      Open in Mermaid
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl shadow-2xl p-16 text-center hover:shadow-blue-500/20 transition-all duration-300">
                <div className="inline-block p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full mb-6 animate-pulse">
                  <Sparkles className="text-blue-400" size={56} />
                </div>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-xl font-medium`}>
                  Enter a transcript to generate your study kit
                </p>
                <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} text-sm mt-2`}>
                  AI-powered learning materials in seconds ⚡
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-sm`}>
            Powered by AI • Built for Students • Made with 💜
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
