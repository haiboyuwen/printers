import { InvoiceFile, PrintSettings } from '../types';
import PrintSettingsPanel from './PrintSettingsPanel';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/* ---- Preview Page Component ---- */
function PreviewPage({ image, settings, zoom }: { image: string; settings: PrintSettings; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const paperSizes: Record<string, { w: number; h: number }> = {
    A3: { w: 297, h: 420 }, A4: { w: 210, h: 297 }, A5: { w: 148, h: 210 },
    B5: { w: 176, h: 250 }, Letter: { w: 216, h: 279 },
  };

  // Recalculate fit scale when container or settings change
  const recalcFit = useCallback(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const paper = paperSizes[settings.paperSize] || paperSizes.A4;
    const isLandscape = settings.orientation === 'landscape';
    const pw = isLandscape ? paper.h : paper.w;
    const ph = isLandscape ? paper.w : paper.h;

    const pad = 48; // padding inside the container
    const availW = el.clientWidth - pad;
    const availH = el.clientHeight - pad;
    if (availW <= 0 || availH <= 0) return;

    // 1 px ≈ 0.75 mm at screen density; compute scale to fit
    // Rough conversion: aim for ~1px per 0.75mm so 210mm ≈ 280px
    const scaleByW = availW / (pw * 0.75);
    const scaleByH = availH / (ph * 0.75);
    setFitScale(Math.min(scaleByW, scaleByH));
  }, [settings.paperSize, settings.orientation]);

  useEffect(() => {
    recalcFit();
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(recalcFit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalcFit]);

  const paper = paperSizes[settings.paperSize] || paperSizes.A4;
  const isLandscape = settings.orientation === 'landscape';
  const totalScale = fitScale * zoom;
  const pw = (isLandscape ? paper.h : paper.w) * 0.75;
  const ph = (isLandscape ? paper.w : paper.h) * 0.75;
  const mt = settings.margins.top * 0.75;
  const mr = settings.margins.right * 0.75;
  const mb = settings.margins.bottom * 0.75;
  const ml = settings.margins.left * 0.75;

  let cols = 1, rows = 1;
  if (settings.layout === '1x2') { cols = 2; rows = 1; }
  if (settings.layout === '2x2') { cols = 2; rows = 2; }

  const innerW = pw - ml - mr;
  const innerH = ph - mt - mb;
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  let imgScale = 1;
  if (settings.scaleMode === 'custom') imgScale = settings.customScale / 100;

  const filters: string[] = [];
  if (settings.grayscale) filters.push('grayscale(100%)');

  return (
    <div ref={containerRef} style={{ transform: `scale(${totalScale})`, transformOrigin: 'center center' }}>
      <div
        className="bg-white shadow-2xl rounded relative"
        style={{ width: pw, height: ph, overflow: 'hidden' }}
      >
        <div
          className="absolute grid"
          style={{
            top: mt, left: ml, width: innerW, height: innerH,
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {Array.from({ length: cols * rows }).map((_, i) => (
            <div
              key={i}
              className={`overflow-hidden ${settings.autoCenter ? 'flex items-center justify-center' : ''}`}
              style={{
                width: cellW,
                height: cellH,
                borderRight: settings.addCutLine && (i % cols < cols - 1) ? '1px dashed #ccc' : undefined,
                borderBottom: settings.addCutLine && (Math.floor(i / cols) < rows - 1) ? '1px dashed #ccc' : undefined,
              }}
            >
              {i === 0 && (
                <img
                  src={image}
                  alt=""
                  draggable={false}
                  style={{
                    maxWidth: cellW,
                    maxHeight: cellH,
                    objectFit: 'contain',
                    transform: `scale(${imgScale})`,
                    transformOrigin: settings.autoCenter ? 'center center' : 'top left',
                    filter: filters.length ? filters.join(' ') : undefined,
                    ...(settings.hideBackground ? { mixBlendMode: 'multiply' as const } : {}),
                    ...(settings.autoRotate && cellW < cellH ? { transform: `scale(${imgScale}) rotate(90deg)` } : {}),
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface InvoiceListViewProps {
  invoices: InvoiceFile[];
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRemoveInvoice: (id: string) => void;
  onAddFiles: () => void;
  onAddFolder: () => void;
  onClearAll: () => void;
  onUpdateAmount: (id: string, amount: number) => void;
  onPrint: () => void;
  onBatchSettings: () => void;
  onBeautifyFolder?: (folderName: string) => void;
  onRemoveFolder?: (folderName: string) => void;
  onExport?: () => void;
  onExportFolder?: (folderName: string) => void;
  loading: boolean;
}

interface TreeNode {
  label: string;
  path: string;
  depth: number;
  children: TreeNode[];
  invoices: InvoiceFile[];
}

export default function InvoiceListView({
  invoices,
  settings,
  onSettingsChange,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onRemoveInvoice,
  onAddFiles,
  onAddFolder,
  onClearAll,
  onPrint,
  onBeautifyFolder,
  onRemoveFolder,
  onExport,
  onExportFolder,
  loading,
}: InvoiceListViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [folderDisplayNames, setFolderDisplayNames] = useState<Record<string, string>>({});

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return parseInt(localStorage.getItem('sidebarWidth') || '220', 10); }
    catch { return 220; }
  });
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setSidebarWidth(Math.max(150, Math.min(400, e.clientX)));
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  useEffect(() => {
    localStorage.setItem('sidebarWidth', String(sidebarWidth));
  }, [sidebarWidth]);

  // Build recursive folder tree from webkitRelativePath
  const treeRoot = useMemo(() => {
    const nodes: TreeNode[] = [];
    const singleFiles: InvoiceFile[] = [];

    for (const inv of invoices) {
      if (inv.source !== 'folder' || !inv.file.webkitRelativePath) {
        singleFiles.push(inv);
        continue;
      }

      const parts = inv.file.webkitRelativePath.split('/');
      const folderParts = parts.slice(0, -1); // exclude filename

      let currentLevel = nodes;
      let currentPath = '';
      let leafNode: TreeNode | null = null;

      for (let i = 0; i < folderParts.length; i++) {
        const part = folderParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        let node = currentLevel.find((n) => n.path === currentPath);
        if (!node) {
          node = { label: part, path: currentPath, depth: i, children: [], invoices: [] };
          currentLevel.push(node);
        }
        leafNode = node;
        currentLevel = node.children;
      }

      if (leafNode) leafNode.invoices.push(inv);
    }

    return { nodes, singleFiles };
  }, [invoices]);

  const getInvoiceIndex = (invId: string): number => invoices.findIndex((i) => i.id === invId);

  const togglePath = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleBeautify = useCallback((folderPath: string) => {
    // Rename all files in the subtree (handled by App.tsx)
    onBeautifyFolder?.(folderPath);

    // Collect all descendant folder paths
    const allFolderPaths = new Set<string>();
    for (const inv of invoices) {
      if (inv.source !== 'folder' || !inv.file.webkitRelativePath) continue;
      if (!inv.file.webkitRelativePath.startsWith(folderPath + '/')) continue;
      const parts = inv.file.webkitRelativePath.split('/');
      let path = '';
      for (let i = 0; i < parts.length - 1; i++) {
        path = path ? `${path}/${parts[i]}` : parts[i];
        if (path !== folderPath && path.startsWith(folderPath)) {
          allFolderPaths.add(path);
        }
      }
    }

    // Compute display name for each folder independently based on its own files
    const newNames: Record<string, string> = {};

    for (const fp of [folderPath, ...allFolderPaths]) {
      // Find invoices in THIS folder's subtree
      const fInvoices = invoices.filter((inv) => {
        if (inv.source !== 'folder' || !inv.file.webkitRelativePath) return false;
        return inv.file.webkitRelativePath.startsWith(fp + '/');
      });
      if (fInvoices.length === 0) continue;

      // Determine folder's distance from file level
      const fpDepth = fp.split('/').length;
      let maxFileParts = 0;
      for (const inv of fInvoices) {
        const p = inv.file.webkitRelativePath.split('/').length;
        if (p > maxFileParts) maxFileParts = p;
      }
      const distance = maxFileParts - fpDepth; // 1=parent, 2=grandparent, 3+=higher

      // Get earliest date from this folder's own files
      const sorted = [...fInvoices].sort((a, b) => {
        const da = a.date || '9999-99-99';
        const db = b.date || '9999-99-99';
        return da.localeCompare(db);
      });
      const first = sorted[0];
      const firstDate = first?.date || (first ? new Date(first.file.lastModified).toISOString().slice(0, 10) : null);
      const hasDate = firstDate && firstDate !== '0000-00-00';
      const dateCompact = (firstDate || '').replace(/-/g, '');
      const totalAmt = fInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
      const amtStr = totalAmt > 0 ? totalAmt.toFixed(2) : '';

      if (hasDate && distance === 1) {
        newNames[fp] = `${dateCompact.slice(0, 6)}-${amtStr}`; // YYYYMM-金额
      } else if (hasDate && distance === 2) {
        newNames[fp] = `${dateCompact.slice(0, 4)}-${amtStr}`; // YYYY-金额
      } else {
        // distance >= 3 or no date: keep original name + amount
        newNames[fp] = amtStr ? `${fp}-${amtStr}` : fp;
      }
    }

    setFolderDisplayNames((prev) => ({ ...prev, ...newNames }));
  }, [invoices, onBeautifyFolder]);

  useEffect(() => {
    if (currentIndex >= invoices.length && invoices.length > 0) {
      setCurrentIndex(invoices.length - 1);
    }
  }, [invoices.length, currentIndex]);

  useEffect(() => {
    setCurrentPageIndex(0);
  }, [currentIndex]);

  // Clean up folderDisplayNames when folders are removed
  useEffect(() => {
    const existingPaths = new Set<string>();
    for (const inv of invoices) {
      if (inv.source !== 'folder' || !inv.file.webkitRelativePath) continue;
      const parts = inv.file.webkitRelativePath.split('/');
      let path = '';
      for (let i = 0; i < parts.length - 1; i++) {
        path = path ? `${path}/${parts[i]}` : parts[i];
        existingPaths.add(path);
      }
    }
    setFolderDisplayNames((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!existingPaths.has(key)) delete next[key];
      }
      return next;
    });
  }, [invoices]);

  // Empty state when no invoices
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-6 p-8 bg-gray-50"
        onDragOver={(e) => e.preventDefault()}
      >
        <svg className="w-20 h-20 text-gray-300" viewBox="0 0 96 96" fill="none">
          <path d="M21 12h36l18 18v48a8 8 0 0 1-8 8H21a8 8 0 0 1-8-8V20a8 8 0 0 1 8-8Z" fill="#a9d9fb" />
          <path d="M57 12v18h18" fill="#43aef2" />
          <path d="M48 45v25M35.5 57.5h25" stroke="white" strokeWidth="8" strokeLinecap="round" />
        </svg>
        <p className="text-gray-500 text-sm">暂无发票，请通过以下方式添加</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddFiles}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            添加文件
          </button>
          <button
            onClick={onAddFolder}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-blue-600 border-2 border-blue-200 rounded-lg text-sm font-medium hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            添加文件夹
          </button>
        </div>
      </div>
    );
  }

  // Render a single sidebar item (text only, no thumbnail)
  const renderFileItem = (invoice: InvoiceFile) => {
    const idx = getInvoiceIndex(invoice.id);
    return (
      <div
        key={invoice.id}
        onClick={() => setCurrentIndex(idx)}
        className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg cursor-pointer transition-all group text-xs ${
          idx === currentIndex
            ? 'bg-blue-100 text-blue-800 font-medium'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(invoice.id); }}
          className="shrink-0"
        >
          {invoice.selected ? (
            <CheckSquare className="w-3 h-3 text-blue-600" />
          ) : (
            <Square className="w-3 h-3 text-gray-300 group-hover:text-gray-400" />
          )}
        </button>
        <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="truncate flex-1">{invoice.fileName}</span>
        <span className="shrink-0">{invoice.totalAmount > 0 ? `¥${invoice.totalAmount.toFixed(2)}` : '--'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveInvoice(invoice.id); }}
          className="shrink-0 text-gray-300 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const selectedInvoices = invoices.filter((inv) => inv.selected);
  const selectedTotal = selectedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const allSelected = invoices.length > 0 && invoices.every((inv) => inv.selected);

  // Recursive tree node renderer
  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = expandedPaths.has(node.path);
    const totalAmt = node.invoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const displayName = folderDisplayNames[node.path] || node.label;
    const hasChildren = node.children.length > 0;
    const collapsible = hasChildren || node.invoices.length > 0;

    return (
      <div key={node.path} className="mb-0.5">
        <div
          className="flex items-center gap-1 w-full px-1 py-1.5 text-xs font-medium text-gray-600 rounded transition-colors"
        >
          {/* Toggle triangle */}
          {collapsible ? (
            <svg
              onClick={() => togglePath(node.path)}
              className={`w-3 h-3 shrink-0 cursor-pointer transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          {/* Folder icon */}
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>

          {/* Folder name */}
          <span
            onClick={() => { if (collapsible) togglePath(node.path); }}
            className="flex-1 min-w-0 cursor-pointer truncate hover:text-blue-700"
          >
            {displayName}
          </span>

          {/* Total / count */}
          {node.invoices.length > 0 && (
            <span className="shrink-0 text-[10px] text-gray-400">
              ¥{totalAmt.toFixed(2)}
              <span className="mx-0.5">/</span>
              {node.invoices.length}
            </span>
          )}

          {/* Beautify */}
          <span
            onClick={(e) => { e.stopPropagation(); handleBeautify(node.path); }}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleBeautify(node.path); }}}
            className="p-0.5 rounded cursor-pointer hover:bg-purple-100 text-gray-400 hover:text-purple-600 inline-flex shrink-0"
            title="美化文件名"
          >
            <Sparkles className="w-3 h-3" />
          </span>

          {/* Export */}
          <span
            onClick={(e) => { e.stopPropagation(); onExportFolder?.(node.path); }}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onExportFolder?.(node.path); }}}
            className="p-0.5 rounded cursor-pointer hover:bg-blue-100 text-gray-400 hover:text-blue-600 inline-flex shrink-0"
            title="导出文件夹"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </span>

          {/* Remove */}
          <span
            onClick={(e) => { e.stopPropagation(); onRemoveFolder?.(node.path); }}
            role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onRemoveFolder?.(node.path); }}}
            className="p-0.5 rounded cursor-pointer hover:bg-red-100 text-gray-400 hover:text-red-600 inline-flex shrink-0"
            title="删除文件夹"
          >
            <Trash2 className="w-3 h-3" />
          </span>
        </div>

        {/* Expanded children */}
        {isExpanded && (
          <div className="ml-3">
            {node.invoices.map((inv) => renderFileItem(inv))}
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const currentInvoice = invoices[currentIndex];

  const goFirst = () => setCurrentIndex(0);
  const goPrev = () => setCurrentIndex(Math.max(0, currentIndex - 1));
  const goNext = () => setCurrentIndex(Math.min(invoices.length - 1, currentIndex + 1));
  const goLast = () => setCurrentIndex(invoices.length - 1);

  const currentPageImage = currentInvoice
    ? currentInvoice.pages[currentPageIndex] || currentInvoice.pages[0] || null
    : null;

  return (
    <div className="flex h-full">
      {/* Left sidebar - file list */}
      <div
        className="bg-gray-50/80 border-r border-gray-200 flex flex-col flex-shrink-0"
        style={{ width: sidebarWidth }}
      >
        <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2">
          {/* Single files (non-folder) */}
          {treeRoot.singleFiles.length > 0 && (
            <div className="mb-2">
              <div className="text-xs font-medium text-gray-500 px-1 py-1">文件</div>
              <div className="space-y-0.5">
                {treeRoot.singleFiles.map((inv) => renderFileItem(inv))}
              </div>
            </div>
          )}

          {/* Recursive folder tree */}
          {treeRoot.nodes.map((node) => renderTreeNode(node))}
        </div>

        <button
          onClick={onAddFiles}
          className="flex items-center justify-center gap-1.5 py-2.5 text-blue-600 hover:bg-blue-50 text-sm font-medium border-t border-gray-200 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          添加发票
        </button>
        <button
          onClick={onAddFolder}
          className="flex items-center justify-center gap-1.5 py-2.5 text-blue-600 hover:bg-blue-50 text-sm font-medium transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          添加文件夹
        </button>
        {invoices.length > 0 && (
          <>
            <button
              onClick={onExport}
              className="flex items-center justify-center gap-1.5 py-2.5 text-green-600 hover:bg-green-50 text-sm font-medium transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出文件
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center justify-center gap-1.5 py-2.5 text-red-500 hover:bg-red-50 text-sm font-medium border-t border-gray-200 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              一键清空
            </button>
          </>
        )}
      </div>

      {/* Drag handle for sidebar resize */}
      <div
        onMouseDown={handleDragStart}
        className={`w-1.5 cursor-col-resize flex-shrink-0 flex items-center justify-center transition-colors relative ${
          isDragging ? 'bg-blue-500/20' : 'hover:bg-blue-300/15'
        }`}
      >
        <div className={`w-px h-full ${isDragging ? 'bg-blue-500' : 'bg-gray-200'}`} />
      </div>

      {/* Center - preview area */}
      <div className="flex-1 flex flex-col bg-gray-100 min-w-0">
        <div className="flex-1 flex items-center justify-center overflow-auto p-4">
          {currentPageImage ? (
            <PreviewPage
              image={currentPageImage}
              settings={settings}
              zoom={previewZoom}
            />
          ) : (
            <div className="text-gray-400 text-sm flex flex-col items-center gap-3">
              <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              暂无发票预览
            </div>
          )}
        </div>

        {/* Bottom navigation */}
        <div className="flex items-center justify-center gap-1.5 py-2.5 bg-white border-t border-gray-200 shadow-inner flex-shrink-0">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1.5 rounded hover:bg-blue-50 transition-colors"
          >
            {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5" />}
            <span className="font-medium">{allSelected ? '取消全选' : '全选'}</span>
          </button>
          <div className="w-px h-4 bg-gray-200" />

          <button onClick={goFirst} disabled={currentIndex === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed"><ChevronsLeft className="w-4 h-4 text-gray-600" /></button>
          <button onClick={goPrev} disabled={currentIndex === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
          <input
            type="text"
            value={invoices.length > 0 ? `${currentIndex + 1}/${invoices.length}` : '0/0'}
            readOnly
            className="w-16 text-center py-1 border border-gray-300 rounded text-sm text-gray-700 bg-white mx-1"
          />
          <button onClick={goNext} disabled={currentIndex >= invoices.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
          <button onClick={goLast} disabled={currentIndex >= invoices.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed"><ChevronsRight className="w-4 h-4 text-gray-600" /></button>

          {/* Page within doc */}
          {currentInvoice && currentInvoice.pageCount > 1 && (
            <>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <span className="text-xs text-gray-400">页:</span>
              <button
                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed"
              ><ChevronLeft className="w-3.5 h-3.5 text-gray-500" /></button>
              <span className="text-xs text-gray-600 min-w-[28px] text-center">{currentPageIndex + 1}/{currentInvoice.pageCount}</span>
              <button
                onClick={() => setCurrentPageIndex(Math.min(currentInvoice.pageCount - 1, currentPageIndex + 1))}
                disabled={currentPageIndex >= currentInvoice.pageCount - 1}
                className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed"
              ><ChevronRight className="w-3.5 h-3.5 text-gray-500" /></button>
            </>
          )}

          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.15))} className="p-1 rounded hover:bg-gray-100" title="放大"><ZoomIn className="w-4 h-4 text-gray-600" /></button>
          <span className="text-xs text-gray-400 min-w-[32px] text-center">{Math.round(previewZoom * 100)}%</span>
          <button onClick={() => setPreviewZoom(Math.max(0.2, previewZoom - 0.15))} className="p-1 rounded hover:bg-gray-100" title="缩小"><ZoomOut className="w-4 h-4 text-gray-600" /></button>
        </div>
      </div>

      {/* Right sidebar - print settings */}
      <div className="w-[350px] border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
        <PrintSettingsPanel
          settings={settings}
          onChange={onSettingsChange}
          totalInvoices={invoices.length}
          selectedInvoices={selectedInvoices.length}
          selectedTotal={selectedTotal}
          mode="sidebar"
          onPrint={onPrint}
        />
      </div>
    </div>
  );
}
