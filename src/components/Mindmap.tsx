import { useEffect, useRef } from 'react';
import { FileDown, Copy } from 'lucide-react';

interface Props {
  mindmap: string;
}

export function Mindmap({ mindmap }: Props) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Visual Mindmap</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <Copy size={16} />
            Copy Code
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <FileDown size={16} />
            Export
          </button>
        </div>
      </div>

      {mindmap ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
            <div ref={mermaidRef} className="flex justify-center" />
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
              View Mermaid Code
            </summary>
            <pre className="mt-2 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
              {mindmap}
            </pre>
          </details>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No mindmap generated yet</p>
      )}
    </div>
  );
}
