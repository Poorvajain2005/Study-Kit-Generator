import { Copy, Download } from 'lucide-react';

interface Props {
  content: string;
  darkMode: boolean;
}

export function Summary({ content, darkMode }: Props) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-slate-900/40 border-slate-700/70' : 'bg-white/90 border-slate-200'}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>Document Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-300 hover:-translate-y-0.5 ${
              darkMode
                ? 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Copy size={16} />
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-300 transition-all duration-300 hover:-translate-y-0.5"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>

      <div
        className={`scroll-thin max-h-[600px] overflow-y-auto rounded-xl border p-6 ${
          darkMode ? 'border-slate-700/70 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className={`whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {content}
        </div>
      </div>
    </div>
  );
}
