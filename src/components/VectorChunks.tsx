import { FileDown } from 'lucide-react';
import { Chunk } from '../types';

interface Props {
  chunks: Chunk[];
  darkMode: boolean;
}

export function VectorChunks({ chunks, darkMode }: Props) {
  const handleExport = () => {
    const json = JSON.stringify(chunks, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vector-chunks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardTone = darkMode
    ? 'bg-slate-900/40 border-slate-700/70 text-slate-100'
    : 'bg-white/90 border-slate-200 text-slate-900';

  return (
    <div className={`rounded-2xl border p-6 ${cardTone}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>
          Vector Chunks ({chunks?.length || 0})
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-300 transition-all duration-300 hover:-translate-y-0.5"
        >
          <FileDown size={16} />
          Export JSON
        </button>
      </div>

      {chunks && chunks.length > 0 ? (
        <div className="scroll-thin max-h-[600px] space-y-3 overflow-y-auto">
          {chunks.map((chunk) => (
            <div
              key={chunk.chunk_id}
              className={`rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 ${
                darkMode
                  ? 'border-slate-700/70 bg-slate-900/30 hover:border-cyan-400/40'
                  : 'border-slate-200 bg-slate-50 hover:border-cyan-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  darkMode
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'bg-cyan-100 text-cyan-700'
                }`}>
                  Chunk #{chunk.chunk_id}
                </span>
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {chunk.content.length} characters
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                {chunk.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className={`py-8 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No chunks generated yet</p>
      )}
    </div>
  );
}
