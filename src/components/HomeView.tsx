import { useState } from 'react';
import { Plus, Upload, FolderOpen } from 'lucide-react';

interface HomeViewProps {
  onAddFiles: () => void;
  onAddFolder: () => void;
  onBatchSettings: () => void;
  loading: boolean;
}

export default function HomeView({ onAddFiles, onAddFolder, onBatchSettings, loading }: HomeViewProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={`bg-white rounded-xl border-2 w-full h-full flex flex-col items-center justify-center transition-all ${
            dragOver
              ? 'border-blue-400 bg-blue-50/50 border-dashed'
              : 'border-gray-200 border-solid'
          }`}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={() => setDragOver(false)}
        >
          {dragOver ? (
            <>
              <Upload className="w-16 h-16 text-blue-400 mb-4" strokeWidth={1.5} />
              <p className="text-blue-500 text-lg font-medium">释放文件以添加</p>
            </>
          ) : (
            <>
              {/* File icon */}
              <div className="mb-6">
                <svg width="96" height="112" viewBox="0 0 96 112" fill="none">
                  <path d="M8 8C8 3.58172 11.5817 0 16 0H60L88 28V104C88 108.418 84.4183 112 80 112H16C11.5817 112 8 108.418 8 104V8Z" fill="url(#fileGrad)" />
                  <path d="M60 0L88 28H68C63.5817 28 60 24.4183 60 20V0Z" fill="#B3DAFF" />
                  <rect x="34" y="52" width="28" height="4" rx="2" fill="white" />
                  <rect x="46" y="40" width="4" height="28" rx="2" fill="white" />
                  <defs>
                    <linearGradient id="fileGrad" x1="48" y1="0" x2="48" y2="112" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#90CAF9" />
                      <stop offset="1" stopColor="#64B5F6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <p className="text-gray-500 text-base mb-1">支持批量打印PDF类型文档</p>
              <p className="text-gray-400 text-sm mb-6">拖拽PDF文件到此处，或点击下方按钮添加</p>

              <div className="flex items-center gap-3">
                <button
                  onClick={onAddFiles}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all active:scale-95 shadow-sm shadow-blue-200 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                  )}
                  {loading ? '解析中...' : '添加文件'}
                </button>
                <button
                  onClick={onAddFolder}
                  disabled={loading}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-blue-600 border-2 border-blue-200 rounded-lg text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  <FolderOpen className="w-4 h-4" strokeWidth={2} />
                  添加文件夹
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white">
        <button
          onClick={onBatchSettings}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          批量打印设置
        </button>
        <button
          className="px-6 py-2.5 bg-blue-100 text-blue-300 rounded-lg text-sm font-medium cursor-not-allowed"
          disabled
        >
          开始打印
        </button>
      </div>
    </div>
  );
}
