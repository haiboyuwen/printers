import { useState, useEffect } from 'react';
import { PrintSettings } from '../types';
import { Printer, ChevronDown } from 'lucide-react';
import MarginsDialog from './MarginsDialog';

const FALLBACK_PRINTERS: string[] = [];

interface PrintSettingsPanelProps {
  settings: PrintSettings;
  onChange: (settings: PrintSettings) => void;
  totalInvoices: number;
  selectedInvoices: number;
  selectedTotal: number;
  mode?: 'sidebar' | 'modal';
  onClose?: () => void;
  onPrint?: () => void;
}

export default function PrintSettingsPanel({
  settings,
  onChange,
  totalInvoices,
  selectedInvoices,
  selectedTotal,
  mode = 'sidebar',
  onClose,
  onPrint,
}: PrintSettingsPanelProps) {
  const [showMargins, setShowMargins] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>(FALLBACK_PRINTERS);
  const [printersLoading, setPrintersLoading] = useState(true);

  // Fetch locally configured printers via API
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/printers', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.printers && data.printers.length > 0) {
          setAvailablePrinters(data.printers);
          // Auto-select first real printer if current selection is a fallback
          if (!data.printers.includes(settings.printer)) {
            update({ printer: data.printers[0] });
          }
        }
      })
      .catch(() => {
        // API not available (production single-file build), use fallback
      })
      .finally(() => setPrintersLoading(false));
    return () => controller.abort();
  }, []);

  const update = (partial: Partial<PrintSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">打印设置</h3>

          {/* ---- 打印机 ---- */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap w-[60px] text-right">打印机</label>
              <div className="relative flex-1">
                <Printer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={settings.printer}
                  onChange={(e) => update({ printer: e.target.value })}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {printersLoading && <option value="">加载中...</option>}
                  {!printersLoading && availablePrinters.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ---- 基础 ---- */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">基础</h4>

            {/* Tabs: 页面大小 / 一张多页 / 小册子 */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['pageSize', 'multiPage', 'booklet'] as const).map((tab) => {
                const labels = { pageSize: '页面大小', multiPage: '一张多页', booklet: '小册子' };
                return (
                  <button
                    key={tab}
                    onClick={() => update({ tabMode: tab })}
                    className={`flex-1 py-1.5 text-sm rounded-md transition-all ${
                      settings.tabMode === tab
                        ? 'bg-white text-gray-900 shadow-sm font-medium'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Scale mode radios */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {([
                { value: 'fit' as const, label: '适合打印边距' },
                { value: 'actual' as const, label: '实际大小' },
                { value: 'shrink' as const, label: '缩小过大页面' },
                { value: 'custom' as const, label: '自定义比例' },
              ]).map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`scaleMode_${mode}`}
                    checked={settings.scaleMode === opt.value}
                    onChange={() => update({ scaleMode: opt.value })}
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>

            {settings.scaleMode === 'custom' && (
              <div className="flex items-center gap-2 pl-5">
                <input
                  type="number"
                  min={10}
                  max={400}
                  step={1}
                  value={settings.customScale}
                  onChange={(e) => update({ customScale: Math.max(10, Math.min(400, parseFloat(e.target.value) || 100)) })}
                  className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={settings.duplex} onChange={(e) => update({ duplex: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">使用双面打印</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={settings.collate} onChange={(e) => update({ collate: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">逐份打印</span>
              </label>
            </div>
          </div>

          {/* ---- 页面设置 ---- */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">页面设置</h4>

            {/* Copies + Paper size */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap w-[60px] text-right">打印份数</label>
              <input
                type="number"
                min={1}
                max={999}
                value={settings.copies}
                onChange={(e) => update({ copies: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <label className="text-sm text-gray-600 whitespace-nowrap ml-2">纸张大小</label>
              <div className="relative flex-1">
                <select
                  value={settings.paperSize}
                  onChange={(e) => update({ paperSize: e.target.value })}
                  className="w-full px-3 py-1.5 pr-7 border border-gray-300 rounded-lg text-sm bg-white appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {['A3', 'A4', 'A5', 'B5', 'Letter'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap w-[60px] text-right">纸张方向</label>
              <div className="flex gap-3">
                {([
                  { value: 'auto' as const, label: '自动横向/纵向' },
                  { value: 'portrait' as const, label: '纵向' },
                  { value: 'landscape' as const, label: '横向' },
                ]).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name={`orientation_${mode}`}
                      checked={settings.orientation === opt.value}
                      onChange={() => update({ orientation: opt.value })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Margins button */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 whitespace-nowrap w-[60px] text-right">页边距</span>
              <button
                onClick={() => setShowMargins(true)}
                className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {settings.margins.top}/{settings.margins.right}/{settings.margins.bottom}/{settings.margins.left} mm
              </button>
            </div>

            {/* Color */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 whitespace-nowrap w-[60px] text-right">颜色</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={settings.grayscale} onChange={(e) => update({ grayscale: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">灰度打印</span>
              </label>
            </div>
          </div>

          {/* ---- 打印排版 ---- */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">打印排版</h4>

            {/* Layout */}
            <div className="space-y-2">
              <label className="text-sm text-gray-600">排版方式</label>
              <div className="flex gap-3">
                {([
                  { value: '1x1' as const },
                  { value: '1x2' as const },
                  { value: '2x2' as const },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update({ layout: opt.value })}
                    className={`relative w-[76px] h-[56px] border-2 rounded-lg flex items-center justify-center transition-all ${
                      settings.layout === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {opt.value === '1x1' && (
                      <div className="w-[46px] h-[32px] border border-gray-400 rounded flex items-center justify-center">
                        <span className="text-[9px] text-gray-500">发票</span>
                      </div>
                    )}
                    {opt.value === '1x2' && (
                      <div className="flex gap-1">
                        <div className="w-[20px] h-[32px] border border-gray-400 rounded flex items-center justify-center">
                          <span className="text-[7px] text-gray-500">发票</span>
                        </div>
                        <div className="w-[20px] h-[32px] border border-gray-400 rounded flex items-center justify-center">
                          <span className="text-[7px] text-gray-500">发票</span>
                        </div>
                      </div>
                    )}
                    {opt.value === '2x2' && (
                      <div className="grid grid-cols-2 gap-0.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="w-[18px] h-[14px] border border-gray-400 rounded flex items-center justify-center">
                            <span className="text-[5px] text-gray-500">发票</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {settings.layout === opt.value && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={settings.addCutLine} onChange={(e) => update({ addCutLine: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-600" />
              <span className="text-sm text-gray-700">添加裁剪线</span>
            </label>
          </div>

          {/* ---- 内容 ---- */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">内容</h4>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap w-[60px] text-right">打印内容</label>
              <div className="relative flex-1">
                <select
                  value={settings.printContent}
                  onChange={(e) => update({ printContent: e.target.value })}
                  className="w-full px-3 py-1.5 pr-7 border border-gray-300 rounded-lg text-sm bg-white appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="doc_and_marks">文档和标注</option>
                  <option value="doc_only">仅文档</option>
                  <option value="marks_only">仅标注</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap w-[60px] text-right">清单布局</label>
              <div className="relative flex-1">
                <select
                  value={settings.listLayout}
                  onChange={(e) => update({ listLayout: e.target.value })}
                  className="w-full px-3 py-1.5 pr-7 border border-gray-300 rounded-lg text-sm bg-white appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="follow">清单跟随发票</option>
                  <option value="separate">清单独立页面</option>
                  <option value="none">不打印清单</option>
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={settings.autoCenter} onChange={(e) => update({ autoCenter: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">自动居中</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={settings.autoRotate} onChange={(e) => update({ autoRotate: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">自动旋转</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={settings.hideBackground} onChange={(e) => update({ hideBackground: e.target.checked })} className="w-3.5 h-3.5 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">隐藏页面背景</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50/80 flex-shrink-0">
          <div className="text-sm text-gray-600 text-right mb-3">
            共 <span className="font-bold text-gray-900">{selectedInvoices}</span> 张票据
            {totalInvoices > 0 && <span className="text-gray-400">（共{totalInvoices}张）</span>}
            ，发票金额合计：
            <span className="font-bold text-base text-red-600 ml-1">¥ {selectedTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-3">
            {mode === 'modal' && onClose && (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            )}
            <button
              onClick={onPrint}
              disabled={selectedInvoices === 0}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors active:bg-blue-800 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              开始打印
            </button>
          </div>
        </div>
      </div>

      <MarginsDialog
        isOpen={showMargins}
        onClose={() => setShowMargins(false)}
        margins={settings.margins}
        onChange={(m) => update({ margins: m })}
      />
    </>
  );
}
