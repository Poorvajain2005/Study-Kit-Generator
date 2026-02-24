import { FileDown } from 'lucide-react';
import { CornellNotes as CornellNotesType } from '../types';

interface Props {
  notes: CornellNotesType;
  darkMode: boolean;
}

export function CornellNotes({ notes, darkMode }: Props) {
  const handleExport = () => {
    let content = 'CORNELL METHOD NOTES\n\n';

    notes.keyPoints.forEach((item, idx) => {
      content += `${idx + 1}. ${item.point}\n`;
      content += `   ${item.details}\n\n`;
    });

    content += '\nSUMMARY:\n';
    content += notes.summary;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cornell-notes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardTone = darkMode
    ? 'bg-slate-900/40 border-slate-700/70 text-slate-100'
    : 'bg-white/90 border-slate-200 text-slate-900';

  const headingTone = darkMode ? 'text-cyan-300' : 'text-cyan-700';
  const subTone = darkMode ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className={`rounded-2xl border p-6 ${cardTone}`}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${headingTone}`}>Cornell Notes</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-300 transition-all duration-300 hover:-translate-y-0.5"
        >
          <FileDown size={16} />
          Export
        </button>
      </div>

      <div className="space-y-6">
        {notes.keyPoints && notes.keyPoints.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className={`rounded-xl border p-4 md:col-span-1 ${darkMode ? 'border-slate-700/80 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className={`mb-3 font-semibold ${subTone}`}>Key Points</h3>
                <div className="space-y-3">
                  {notes.keyPoints.map((item, idx) => (
                    <div key={idx} className={`rounded-lg px-3 py-2 text-sm font-medium ${darkMode ? 'bg-slate-800/70 text-slate-200' : 'bg-white text-slate-800'}`}>
                      {item.point}
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border p-4 md:col-span-2 ${darkMode ? 'border-slate-700/80 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
                <h3 className={`mb-3 font-semibold ${subTone}`}>Details</h3>
                <div className="space-y-3">
                  {notes.keyPoints.map((item, idx) => (
                    <div key={idx} className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${subTone}`}>
                      {item.details}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${darkMode ? 'border-slate-700/80 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className={`mb-2 font-semibold ${subTone}`}>Summary</h3>
              <p className={`text-sm leading-relaxed ${subTone}`}>
                {notes.summary}
              </p>
            </div>
          </>
        ) : (
          <p className={`py-8 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No notes generated yet</p>
        )}
      </div>
    </div>
  );
}
