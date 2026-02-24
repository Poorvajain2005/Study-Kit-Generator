import { FileDown } from 'lucide-react';
import { CornellNotes as CornellNotesType } from '../types';

interface Props {
  notes: CornellNotesType;
}

export function CornellNotes({ notes }: Props) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Cornell Notes</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <FileDown size={16} />
          Export
        </button>
      </div>

      <div className="space-y-6">
        {notes.keyPoints && notes.keyPoints.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 border-r border-gray-300 pr-4">
                <h3 className="font-semibold text-gray-700 mb-3">Key Points</h3>
                <div className="space-y-3">
                  {notes.keyPoints.map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-800 font-medium">
                      {item.point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <h3 className="font-semibold text-gray-700 mb-3">Details</h3>
                <div className="space-y-3">
                  {notes.keyPoints.map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-600 leading-relaxed">
                      {item.details}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-300 pt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Summary</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {notes.summary}
              </p>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">No notes generated yet</p>
        )}
      </div>
    </div>
  );
}
