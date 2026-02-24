import { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Loader2,
  Download,
  Brain,
  Zap,
  Award,
  TrendingUp,
  Moon,
  Sun,
  Upload,
  Bot,
  Send,
  X,
  FileText,
} from 'lucide-react';
import { Flashcards } from './components/Flashcards';
import { Mindmap } from './components/Mindmap';
import { MindmapJSON, MindmapNode } from './components/MindmapJSON';
import { Summary } from './components/Summary';
import { Flashcard } from './types';

type BuildType = 'flashcards' | 'mindmap' | 'summary';
type OutputTab = 'flashcards' | 'mindmap' | 'summary';

type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error(`Failed to read file: ${file.name}`));
        return;
      }
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function App() {
  const MAX_FILES = 3;
  const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
  const MAX_TOTAL_SIZE_BYTES = 15 * 1024 * 1024;

  const [files, setFiles] = useState<File[]>([]);
  const [buildType, setBuildType] = useState<BuildType>('flashcards');
  const [activeTab, setActiveTab] = useState<OutputTab>('flashcards');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [quotaBlockedUntil, setQuotaBlockedUntil] = useState<number | null>(null);
  const [nextRequestAllowedAt, setNextRequestAllowedAt] = useState<number | null>(null);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null);
  const [useMermaidMode, setUseMermaidMode] = useState(false);
  const [summary, setSummary] = useState('');

  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'Hi! Upload PDFs/PPTs and ask anything. I can explain concepts, summarize slides, or quiz you.' },
  ]);

  const getRemainingCooldownSeconds = () => {
    if (!quotaBlockedUntil) return 0;
    return Math.max(0, Math.ceil((quotaBlockedUntil - Date.now()) / 1000));
  };

  const getRemainingThrottleSeconds = () => {
    if (!nextRequestAllowedAt) return 0;
    return Math.max(0, Math.ceil((nextRequestAllowedAt - Date.now()) / 1000));
  };

  const buildQuotaMessage = (rawMessage: string, retryAfterHeader?: string | null) => {
    const retryMatch = rawMessage.match(/Please retry in\s*([\d.]+)s/i);
    const retryFromHeader = retryAfterHeader ? Math.ceil(Number(retryAfterHeader)) : 0;
    const retrySeconds = Math.max(retryMatch ? Math.ceil(Number(retryMatch[1])) : 0, retryFromHeader, 30);
    setQuotaBlockedUntil(Date.now() + retrySeconds * 1000);

    return `Gemini quota/rate limit reached. Please retry in ~${retrySeconds}s, or enable billing in Google AI Studio.`;
  };

  const validateUploadedFiles = (uploadedFiles: File[]) => {
    if (uploadedFiles.length > MAX_FILES) {
      throw new Error(`Upload up to ${MAX_FILES} files at once to keep requests stable.`);
    }

    const invalidSizeFile = uploadedFiles.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (invalidSizeFile) {
      throw new Error(`File too large: ${invalidSizeFile.name}. Keep each file under ${Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB.`);
    }

    const totalBytes = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_SIZE_BYTES) {
      throw new Error(`Total upload too large. Keep combined files under ${Math.floor(MAX_TOTAL_SIZE_BYTES / (1024 * 1024))}MB.`);
    }
  };

  const generateWithGemini = async (systemPrompt: string, userPrompt: string, uploadedFiles: File[], responseMimeType?: string) => {
    const geminiKey = import.meta.env.GEMINI_API_KEY;

    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY is missing. Add it to your .env file.');
    }

    console.warn('Gemini Key Working');

    const model = import.meta.env.GEMINI_MODEL || 'gemini-3-flash-preview';

    console.warn(`Using Gemini Model: ${model}`);

    const throttleLeft = getRemainingThrottleSeconds();
    if (throttleLeft > 0) {
      throw new Error(`Local rate limit active. Please wait ~${throttleLeft}s before the next Gemini request.`);
    }

    validateUploadedFiles(uploadedFiles);

    const fileParts = await Promise.all(
      uploadedFiles.map(async (file) => {
        const data = await fileToBase64(file);
        return {
          inlineData: {
            mimeType: file.type || 'application/octet-stream',
            data,
          },
        };
      })
    );

    const cooldownLeft = getRemainingCooldownSeconds();
    if (cooldownLeft > 0) {
      throw new Error(`Gemini is temporarily rate-limited. Please retry in ~${cooldownLeft}s.`);
    }

    let resultData: any = null;
    let lastErrorMessage = 'Failed to generate content';

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }, ...fileParts],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            ...(responseMimeType ? { responseMimeType } : {}),
          },
        }),
      });

      setNextRequestAllowedAt(Date.now() + 12 * 1000);

      if (response.ok) {
        setQuotaBlockedUntil(null);
        resultData = await response.json();
        break;
      }

      const errorData = await response.json().catch(() => null);
      const rawErrorMessage = errorData?.error?.message || `Request failed with model ${model}`;
      lastErrorMessage = rawErrorMessage;

      const lower = rawErrorMessage.toLowerCase();
      const isQuotaError =
        response.status === 429 ||
        lower.includes('quota exceeded') ||
        lower.includes('resource_exhausted') ||
        lower.includes('rate limit') ||
        lower.includes('free_tier_requests') ||
        lower.includes('free_tier_input_token_count');

      if (isQuotaError || response.status === 503) {
        lastErrorMessage = buildQuotaMessage(rawErrorMessage, response.headers.get('Retry-After'));
        if (attempt === 0) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfterSeconds = retryAfterHeader ? Math.ceil(Number(retryAfterHeader)) : 6;
          await sleep(Math.min(10000, Math.max(3000, retryAfterSeconds * 1000)));
          continue;
        }
        throw new Error(lastErrorMessage);
      }

      if (response.status === 404) {
        throw new Error(`Gemini model '${model}' was not found for this API version. Set GEMINI_MODEL in .env to a supported model.`);
      }

      if (response.status !== 404) {
        throw new Error(lastErrorMessage);
      }
    }

    if (!resultData) {
      throw new Error(lastErrorMessage);
    }

    const text = resultData.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  };

  const handleGenerate = async () => {
    const cooldownLeft = getRemainingCooldownSeconds();
    if (cooldownLeft > 0) {
      setError(`Gemini is cooling down. Please wait ~${cooldownLeft}s and retry.`);
      return;
    }

    const throttleLeft = getRemainingThrottleSeconds();
    if (throttleLeft > 0) {
      setError(`Local rate limit active. Please wait ~${throttleLeft}s before trying again.`);
      return;
    }

    if (!files.length) {
      setError('Please upload at least one PDF or PPT file.');
      return;
    }

    try {
      validateUploadedFiles(files);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Invalid files selected.');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 12, 90));
    }, 300);

    try {
      if (buildType === 'mindmap') {
        console.warn('MindMap creation asked');
      }

      const systemPrompt =
        buildType === 'flashcards'
          ? `You are an AI study assistant. From uploaded PDFs/PPTs, generate high-quality, factual flashcards.
Return ONLY valid JSON in this format:
{
  "flashcards": [{"question": "string", "answer": "string"}]
}
Constraints:
- 12 to 25 flashcards
- Questions should be specific and exam-focused
- Answers concise and factual
- No hallucinations`
          : buildType === 'mindmap'
            ? `You are an AI study assistant. From uploaded PDFs/PPTs, generate an interactive mindmap in hierarchical JSON format.
Return ONLY valid JSON:
{
  "mindmap": {
    "id": "root",
    "label": "Main Topic",
    "children": [
      {"id": "unique_id", "label": "Branch Label", "children": [...]}
    ]
  }
}
Constraints:
- Root node is the main topic
- Each node has id (unique string), label (1-4 words), children (optional array)
- Maximum 3-4 levels deep for visual clarity
- Use consistent id values (no duplicates)
- No extra text outside JSON`
            : `You are an AI study assistant. From uploaded PDFs/PPTs, create a comprehensive but concise summary.
Return ONLY valid JSON in this format:
{
  "summary": "string"
}
Constraints:
- 300-600 words
- Cover main topics and key points
- Use clear, organized paragraph structure
- Highlight important concepts
- No extra text outside JSON`;

      const responseText = await generateWithGemini(
        systemPrompt,
        `Use the uploaded documents as the source. Build: ${buildType}. Return valid JSON only.`,
        files,
        'application/json'
      );

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const generated = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

      if (buildType === 'flashcards') {
        setFlashcards(Array.isArray(generated.flashcards) ? generated.flashcards : []);
        setActiveTab('flashcards');
      } else if (buildType === 'mindmap') {
        const mindmapData = generated.mindmap as MindmapNode;
        if (mindmapData && typeof mindmapData === 'object' && mindmapData.id && mindmapData.label) {
          setMindmap(mindmapData);
          setUseMermaidMode(false);
        } else {
          setError('Invalid mindmap format received');
          return;
        }
        setActiveTab('mindmap');
        console.warn('MindMap generated (JSON format)');
      } else {
        setSummary(typeof generated.summary === 'string' ? generated.summary : '');
        setActiveTab('summary');
        console.warn('Summary generated');
      }

      clearInterval(progressInterval);
      setProgress(100);
      setXp((prev) => prev + 30);
      setStreak((prev) => prev + 1);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const cooldownLeft = getRemainingCooldownSeconds();
    if (cooldownLeft > 0) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'model', content: `Gemini is cooling down. Please retry in ~${cooldownLeft}s.` },
      ]);
      return;
    }

    const throttleLeft = getRemainingThrottleSeconds();
    if (throttleLeft > 0) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'model', content: `Local rate limit active. Please retry in ~${throttleLeft}s.` },
      ]);
      return;
    }

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    setError('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const contextForChat = [
        flashcards.length ? `Flashcards Context:\n${flashcards.slice(0, 12).map((card, index) => `${index + 1}. Q: ${card.question}\nA: ${card.answer}`).join('\n')}` : '',
        mindmap ? `Mindmap Context:\n${mindmap}` : '',
        files.length ? `Uploaded Files: ${files.map((file) => file.name).join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const chatPrompt = `Answer this question for a student. Use the supplied context when available and be explicit if details are missing.\n\n${contextForChat || 'No generated context yet.'}\n\nQuestion: ${userMessage}`;
      const responseText = await generateWithGemini(
        'You are a concise, helpful study chatbot. Keep answers clear and practical for students.',
        chatPrompt,
        []
      );

      setChatMessages((prev) => [...prev, { role: 'model', content: responseText }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: err instanceof Error ? `Error: ${err.message}` : 'Something went wrong while generating chat response.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const exportToCsv = () => {
    if (!flashcards.length) return;
    const csv =
      'Question,Answer\n' +
      flashcards
        .map((card) => `"${card.question?.replace(/"/g, '""') || ''}","${card.answer?.replace(/"/g, '""') || ''}"`)
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageBg = darkMode
    ? 'bg-slate-950 bg-mesh text-slate-100'
    : 'bg-gradient-to-br from-slate-50 via-cyan-50 to-violet-50 text-slate-900';

  const mutedText = darkMode ? 'text-slate-300' : 'text-slate-600';
  const panelTone = darkMode ? 'glass panel-ring' : 'bg-white/90 border border-slate-200/80 shadow-xl shadow-cyan-900/5';
  const inputTone = darkMode
    ? 'bg-slate-900/60 border-slate-700/80 text-slate-100 placeholder:text-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <div className={`min-h-screen ${pageBg}`}>
      {loading && (
        <div className="fixed left-0 top-0 z-50 h-1 w-full bg-slate-900/40">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:py-10">
        <div className="relative mb-8 text-center">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`absolute right-0 top-0 rounded-xl p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 ${panelTone}`}
          >
            {darkMode ? <Sun className="text-amber-300" size={20} /> : <Moon className="text-violet-600" size={20} />}
          </button>

          <div className="mb-3 flex items-center justify-center gap-3">
            <div className={`animate-float rounded-2xl p-3.5 ${panelTone}`}>
              <BookOpen className="text-cyan-300" size={34} />
            </div>
            <h1 className="text-gradient text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">Study Kit Generator</h1>
          </div>
          <p className={`mx-auto mb-4 max-w-2xl text-sm md:text-base ${mutedText}`}>
            Upload your PDFs/PPTs, choose what to create, and generate only what you need to reduce API request load.
          </p>

          <div className="mt-4 flex justify-center gap-3 md:gap-4">
            <div className={`card-shadow flex items-center gap-2 rounded-xl px-4 py-2.5 ${panelTone}`}>
              <Award className="text-amber-300" size={18} />
              <span className="text-sm font-semibold tracking-wide">{xp} XP</span>
            </div>
            <div className={`card-shadow flex items-center gap-2 rounded-xl px-4 py-2.5 ${panelTone}`}>
              <TrendingUp className="text-emerald-300" size={18} />
              <span className="text-sm font-semibold tracking-wide">{streak} Day Streak</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className={`rounded-2xl p-6 transition-all duration-300 md:p-7 ${panelTone} card-shadow`}>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-cyan-300">
                <Upload size={19} className="text-cyan-300" />
                Source Files
              </h2>

              <div className="space-y-4">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${mutedText}`}>Upload PDFs / PPTs</label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={(e) => {
                      const selectedFiles = Array.from(e.target.files || []);
                      setError('');
                      try {
                        validateUploadedFiles(selectedFiles);
                        setFiles(selectedFiles);
                      } catch (validationError) {
                        setFiles([]);
                        setError(validationError instanceof Error ? validationError.message : 'Invalid file selection.');
                      }
                    }}
                    className={`w-full rounded-xl border px-4 py-3 outline-none transition-all duration-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-3 file:py-1.5 file:text-cyan-300 file:transition-all ${inputTone}`}
                  />
                </div>

                {files.length > 0 && (
                  <div className={`max-h-40 space-y-2 overflow-y-auto rounded-xl border p-3 ${darkMode ? 'border-slate-700/70 bg-slate-900/50' : 'border-slate-200 bg-slate-50'} scroll-thin`}>
                    {files.map((file) => (
                      <div key={file.name} className="flex items-center gap-2 text-sm">
                        <FileText size={14} className="text-cyan-300" />
                        <span className="truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className={`mb-2 block text-sm font-medium ${mutedText}`}>What do you want to build?</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBuildType('flashcards')}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                        buildType === 'flashcards'
                          ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300'
                          : darkMode
                            ? 'border-slate-700/70 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Flashcards
                    </button>
                    <button
                      onClick={() => setBuildType('mindmap')}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                        buildType === 'mindmap'
                          ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300'
                          : darkMode
                            ? 'border-slate-700/70 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Mindmap
                    </button>
                    <button
                      onClick={() => setBuildType('summary')}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                        buildType === 'summary'
                          ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300'
                          : darkMode
                            ? 'border-slate-700/70 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Summary
                    </button>
                  </div>
                </div>

                {error && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

                {getRemainingCooldownSeconds() > 0 && (
                  <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                    Gemini cooldown active: retry in ~{getRemainingCooldownSeconds()}s.
                  </div>
                )}

                {getRemainingThrottleSeconds() > 0 && (
                  <div className="rounded-xl border border-sky-400/40 bg-sky-500/10 p-3 text-sm text-sky-300">
                    Local request throttle active: retry in ~{getRemainingThrottleSeconds()}s.
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={loading || getRemainingCooldownSeconds() > 0 || getRemainingThrottleSeconds() > 0}
                  className="animate-pulse-glow flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate {buildType === 'flashcards' ? 'Flashcards' : 'Mindmap'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {flashcards.length > 0 || mindmap || summary ? (
              <div className={`overflow-hidden rounded-2xl transition-all duration-300 ${panelTone} card-shadow`}>
                <div className={`grid grid-cols-3 gap-2 border-b p-2 ${darkMode ? 'border-slate-700/60 bg-slate-900/30' : 'border-slate-200 bg-slate-100/60'}`}>
                  <button
                    onClick={() => setActiveTab('flashcards')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 md:text-base ${
                      activeTab === 'flashcards'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 ring-1 ring-cyan-300/40'
                        : darkMode
                          ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <Zap size={18} />
                    Flashcards
                  </button>
                  <button
                    onClick={() => setActiveTab('mindmap')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 md:text-base ${
                      activeTab === 'mindmap'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 ring-1 ring-cyan-300/40'
                        : darkMode
                          ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <Brain size={18} />
                    Mindmap
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 md:text-base ${
                      activeTab === 'summary'
                        ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 ring-1 ring-cyan-300/40'
                        : darkMode
                          ? 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <FileText size={18} />
                    Summary
                  </button>
                </div>

                <div className="min-h-[400px] p-6">
                  {activeTab === 'flashcards' && <Flashcards flashcards={flashcards} darkMode={darkMode} />}
                  {activeTab === 'mindmap' && mindmap && <MindmapJSON data={mindmap} darkMode={darkMode} />}
                  {activeTab === 'summary' && <Summary content={summary} darkMode={darkMode} />}
                </div>

                <div className={`border-t p-4 ${darkMode ? 'border-slate-700/60 bg-slate-900/30' : 'border-slate-200 bg-slate-100/60'}`}>
                  <div className="flex justify-end gap-3">
                    {activeTab === 'flashcards' && (
                      <button
                        onClick={exportToCsv}
                        className="flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-4 py-2.5 font-medium text-emerald-300 transition-all duration-300 hover:-translate-y-0.5"
                      >
                        <Download size={16} />
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl p-14 text-center transition-all duration-300 md:p-16 ${panelTone} card-shadow`}>
                <div className="mb-6 inline-block rounded-full bg-gradient-to-br from-cyan-500/15 to-violet-500/15 p-6">
                  <Sparkles className="text-cyan-300" size={56} />
                </div>
                <p className={`text-xl font-semibold ${mutedText}`}>Upload files and generate one output at a time.</p>
                <p className="mt-2 text-sm text-slate-500">This keeps API calls focused and avoids unnecessary requests.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">Powered by Gemini • Built for Students • Made with 💜</p>
        </div>
      </div>

      <button
        onClick={() => setChatOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-cyan-400/50 bg-slate-900/90 px-4 py-3 text-cyan-300 shadow-lg shadow-cyan-900/40 transition-all hover:-translate-y-0.5"
      >
        {chatOpen ? <X size={18} /> : <Bot size={18} />}
        {chatOpen ? 'Close Chat' : 'Study Chat'}
      </button>

      {chatOpen && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/95 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
            <div className="flex items-center gap-2 text-cyan-300">
              <Bot size={18} />
              <span className="font-semibold">Chatbot</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 transition hover:text-slate-200">
              <X size={18} />
            </button>
          </div>

          <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
            {chatMessages.map((message, idx) => (
              <div
                key={`${message.role}-${idx}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto bg-cyan-500/20 text-cyan-100'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {message.content}
              </div>
            ))}
            {chatLoading && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-300">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          <div className="border-t border-slate-700/70 p-3">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !chatLoading) {
                    handleSendChat();
                  }
                }}
                placeholder="Ask about your uploaded docs..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
              />
              <button
                onClick={handleSendChat}
                disabled={chatLoading || getRemainingCooldownSeconds() > 0 || getRemainingThrottleSeconds() > 0}
                className="rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-3 text-cyan-300 transition hover:bg-cyan-500/30 disabled:opacity-60"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
