import { useEffect, useRef } from 'react';
import { FileDown, Copy } from 'lucide-react';

interface Props {
  mindmap: string;
  darkMode: boolean;
}

export function Mindmap({ mindmap, darkMode }: Props) {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mindmap && mermaidRef.current) {
      import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs').then(
        (mermaid) => {
          mermaid.default.initialize({ startOnLoad: true, theme: 'default' });
          if (mermaidRef.current) {
            mermaidRef.current.innerHTML = mindmap;
            mermaid.default.run({ nodes: [mermaidRef.current] });
          }
        }
      );
    }
  }, [mindmap]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mindmap);
  };

  const handleExport = () => {
    const blob = new Blob([mindmap], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap.mmd';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardTone = darkMode
    ? 'bg-slate-900/40 border-slate-700/70 text-slate-100'
    : 'bg-white/90 border-slate-200 text-slate-900';

  return (
    <div className={`rounded-2xl border p-6 ${cardTone}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>Visual Mindmap</h2>
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
            Copy Code
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-300 transition-all duration-300 hover:-translate-y-0.5"
          >
            <FileDown size={16} />
            Export
          </button>
        </div>
      </div>

      {mindmap ? (
        <div className="space-y-4">
          <div className={`scroll-thin overflow-auto rounded-xl border p-4 ${
            darkMode
              ? 'border-slate-700/80 bg-slate-950/50'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <div ref={mermaidRef} className="flex justify-center" />
          </div>

          <details className="text-sm">
            <summary className={`cursor-pointer font-medium ${darkMode ? 'text-slate-300 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'}`}>
              View Mermaid Code
            </summary>
            <pre className="scroll-thin mt-2 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-200">
              {mindmap}
            </pre>
          </details>
        </div>
      ) : (
        <p className={`py-8 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No mindmap generated yet</p>
      )}
    </div>
  );
}
