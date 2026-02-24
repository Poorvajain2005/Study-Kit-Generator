import { useState } from 'react';
import { ChevronDown, Download, Copy } from 'lucide-react';

export interface MindmapNode {
  id: string;
  label: string;
  children?: MindmapNode[];
}

interface Props {
  data: MindmapNode;
  darkMode: boolean;
}

export function MindmapJSON({ data, darkMode }: Props) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([data.id]));

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleExport = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const renderNode = (node: MindmapNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isRoot = depth === 0;

    return (
      <div key={node.id} className="relative">
        <div
          style={{
            marginLeft: `${depth * 24}px`,
            animation: `slideIn 0.5s ease-out ${depth * 0.08}s both`,
          }}
          className="flex items-center gap-2 py-2"
        >
          {hasChildren && (
            <button
              onClick={() => toggleNode(node.id)}
              className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ChevronDown size={18} className={darkMode ? 'text-cyan-300' : 'text-cyan-600'} />
            </button>
          )}
          {!hasChildren && <div className="w-[18px]" />}

          <div
            className={`px-3 py-2 rounded-lg font-medium transition-all duration-300 ${
              isRoot
                ? darkMode
                  ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-200 border border-cyan-400/50'
                  : 'bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-800 border border-cyan-400'
                : darkMode
                  ? `bg-slate-800 text-slate-100 border border-slate-700/70 hover:bg-slate-700/80`
                  : `bg-slate-100 text-slate-900 border border-slate-300 hover:bg-slate-200`
            }`}
          >
            {node.label}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children!.map((child) => (
              <div key={child.id} className="relative">
                <div
                  className={`absolute left-0 top-0 h-full w-0.5 ${
                    darkMode ? 'bg-slate-700/40' : 'bg-slate-300/40'
                  }`}
                  style={{
                    left: `${depth * 24 + 8}px`,
                    top: '24px',
                    height: '24px',
                  }}
                />
                {renderNode(child, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-slate-900/40 border-slate-700/70' : 'bg-white/90 border-slate-200'}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`text-xl font-semibold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>Interactive Mindmap</h2>
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
            Copy JSON
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-300 transition-all duration-300 hover:-translate-y-0.5"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div
        className={`scroll-thin max-h-[500px] overflow-y-auto rounded-xl border p-6 ${
          darkMode ? 'border-slate-700/70 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
        <div className="space-y-1">{renderNode(data)}</div>
      </div>

      <details className="mt-4 text-sm">
        <summary className={`cursor-pointer font-medium ${darkMode ? 'text-slate-300 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'}`}>
          View Raw JSON
        </summary>
        <pre className="scroll-thin mt-2 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-200">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
