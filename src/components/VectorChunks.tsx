import { FileDown } from 'lucide-react';
import { Chunk } from '../types';

interface Props {
  chunks: Chunk[];
}

export function VectorChunks({ chunks }: Props) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Vector Chunks ({chunks?.length || 0})
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <FileDown size={16} />
          Export JSON
        </button>
      </div>

      {chunks && chunks.length > 0 ? (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {chunks.map((chunk) => (
            <div
              key={chunk.chunk_id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Chunk #{chunk.chunk_id}
                </span>
                <span className="text-xs text-gray-500">
                  {chunk.content.length} characters
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {chunk.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No chunks generated yet</p>
      )}
    </div>
  );
}
