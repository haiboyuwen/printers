import { useState } from 'react';
import { PageMargins } from '../types';
import { X } from 'lucide-react';

interface MarginsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  margins: PageMargins;
  onChange: (margins: PageMargins) => void;
}

export default function MarginsDialog({ isOpen, onClose, margins, onChange }: MarginsDialogProps) {
  const [local, setLocal] = useState<PageMargins>(margins);

  if (!isOpen) return null;

  const update = (key: keyof PageMargins, val: string) => {
    const n = Math.max(0, Math.min(100, parseFloat(val) || 0));
    setLocal((prev) => ({ ...prev, [key]: n }));
  };

  const handleApply = () => {
    onChange(local);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-[360px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">页边距设置 (mm)</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {/* Visual representation */}
          <div className="flex items-center justify-center mb-5">
            <div className="relative w-[140px] h-[180px] border-2 border-gray-300 rounded bg-gray-50">
              {/* Top margin */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <input
                  type="number"
                  value={local.top}
                  onChange={(e) => update('top', e.target.value)}
                  className="w-14 text-center text-xs py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  step="1"
                />
              </div>
              <div className="absolute top-0 left-1/2 w-px h-3 bg-blue-400 -translate-x-1/2" />

              {/* Bottom margin */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <input
                  type="number"
                  value={local.bottom}
                  onChange={(e) => update('bottom', e.target.value)}
                  className="w-14 text-center text-xs py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  step="1"
                />
              </div>
              <div className="absolute bottom-0 left-1/2 w-px h-3 bg-blue-400 -translate-x-1/2" />

              {/* Left margin */}
              <div className="absolute top-1/2 -left-7 -translate-y-1/2">
                <input
                  type="number"
                  value={local.left}
                  onChange={(e) => update('left', e.target.value)}
                  className="w-14 text-center text-xs py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  step="1"
                />
              </div>
              <div className="absolute left-0 top-1/2 w-3 h-px bg-blue-400 -translate-y-1/2" />

              {/* Right margin */}
              <div className="absolute top-1/2 -right-7 -translate-y-1/2">
                <input
                  type="number"
                  value={local.right}
                  onChange={(e) => update('right', e.target.value)}
                  className="w-14 text-center text-xs py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  step="1"
                />
              </div>
              <div className="absolute right-0 top-1/2 w-3 h-px bg-blue-400 -translate-y-1/2" />

              {/* Inner content area */}
              <div
                className="absolute border border-dashed border-blue-300 bg-blue-50/30"
                style={{
                  top: `${(local.top / 297) * 100}%`,
                  left: `${(local.left / 210) * 100}%`,
                  right: `${(local.right / 210) * 100}%`,
                  bottom: `${(local.bottom / 297) * 100}%`,
                  minWidth: '20px',
                  minHeight: '20px',
                }}
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLocal({ top: 0, right: 0, bottom: 0, left: 0 })}
              className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              无边距
            </button>
            <button
              onClick={() => setLocal({ top: 10, right: 10, bottom: 10, left: 10 })}
              className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              窄边距
            </button>
            <button
              onClick={() => setLocal({ top: 25, right: 25, bottom: 25, left: 25 })}
              className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              标准
            </button>
            <button
              onClick={() => setLocal({ top: 30, right: 30, bottom: 30, left: 30 })}
              className="flex-1 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              宽边距
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
