import { useState, useCallback, useRef } from 'react';
import { InvoiceFile, PrintSettings } from './types';
import { parsePDFFile, extractAmount } from './utils/pdf';
import TitleBar from './components/TitleBar';
import InvoiceListView from './components/InvoiceListView';
import SettingsModal from './components/SettingsModal';

const defaultSettings: PrintSettings = {
  printer: '',
  tabMode: 'pageSize',
  scaleMode: 'custom',
  customScale: 90,
  duplex: false,
  collate: true,
  copies: 1,
  paperSize: 'A4',
  orientation: 'landscape',
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  grayscale: false,
  layout: '1x1',
  addCutLine: false,
  listLayout: 'follow',
  printContent: 'doc_and_marks',
  autoCenter: true,
  autoRotate: false,
  hideBackground: false,
};

export default function App() {
  const [invoices, setInvoices] = useState<InvoiceFile[]>([]);
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [printStatusVisible, setPrintStatusVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const selectedInvoices = invoices.filter((inv) => inv.selected);
  const selectedTotal = selectedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  const processFiles = useCallback(async (files: FileList | File[], source: 'file' | 'folder') => {
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfFiles.length === 0) return;

    setLoading(true);
    try {
      const newInvoices: InvoiceFile[] = [];
      for (const file of pdfFiles) {
        try {
          const parsed = await parsePDFFile(file);
          const amount = extractAmount(parsed.textContent);
          newInvoices.push({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            file,
            fileName: file.name,
            pageCount: parsed.pageCount,
            thumbnail: parsed.thumbnail,
            pages: parsed.pages,
            totalAmount: amount,
            date: parsed.date ?? undefined,
            selected: true,
            source,
          });
        } catch (err) {
          console.error(`Failed to parse ${file.name}:`, err);
        }
      }
      if (newInvoices.length > 0) {
        setInvoices((prev) => [...prev, ...newInvoices]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAddFolder = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  const handleClearAll = useCallback(() => {
    setInvoices([]);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files, 'file');
        e.target.value = '';
      }
    },
    [processFiles]
  );

  const handleFolderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files, 'folder');
        e.target.value = '';
      }
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        // Recursively walk dropped items (files and folders)
        const files: File[] = [];
        const walkEntry = async (entry: FileSystemEntry, relPath = '') => {
          if (entry.isFile) {
            const file = await new Promise<File | null>((resolve) =>
              (entry as FileSystemFileEntry).file(resolve)
            );
            if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
              // Set webkitRelativePath so folder grouping works
              Object.defineProperty(file, 'webkitRelativePath', {
                value: relPath + file.name,
                writable: false,
                configurable: true,
              });
              files.push(file);
            }
          } else if (entry.isDirectory) {
            const reader = (entry as FileSystemDirectoryEntry).createReader();
            // Read all entries in batches (readEntries returns batches)
            const allEntries: FileSystemEntry[] = [];
            let batch: FileSystemEntry[];
            do {
              batch = await new Promise<FileSystemEntry[]>((resolve) =>
                reader.readEntries(resolve)
              );
              allEntries.push(...batch);
            } while (batch.length > 0);
            await Promise.all(allEntries.map((e) => walkEntry(e, relPath + entry.name + '/')));
          }
        };
        await Promise.all(
          Array.from(e.dataTransfer.items).map(async (item) => {
            const entry = item.webkitGetAsEntry();
            if (entry) await walkEntry(entry);
          })
        );
        if (files.length > 0) {
          processFiles(files, 'folder');
        }
      } else if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files, 'file');
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, selected: !inv.selected } : inv))
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setInvoices((prev) => prev.map((inv) => ({ ...inv, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setInvoices((prev) => prev.map((inv) => ({ ...inv, selected: false })));
  }, []);

  const handleRemoveInvoice = useCallback((id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  const handleUpdateAmount = useCallback((id: string, amount: number) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, totalAmount: amount } : inv))
    );
  }, []);

  const handleBeautifyFolder = useCallback((folderName: string) => {
    setInvoices((prev) => {
      // Find all invoices belonging to this folder
      const folderInvoices = prev.filter((inv) => {
        if (inv.source !== 'folder') return false;
        return inv.file.webkitRelativePath?.startsWith(folderName + '/');
      });
      if (folderInvoices.length === 0) return prev;

      // Sort by date then amount
      const sorted = [...folderInvoices].sort((a, b) => {
        const da = a.date || '9999-99-99';
        const db = b.date || '9999-99-99';
        if (da !== db) return da.localeCompare(db);
        return a.totalAmount - b.totalAmount;
      });

      // Generate new filenames: YYYYMMDD-AMOUNT-SEQ.pdf with sequential numbering
      const ids = new Set(sorted.map((s) => s.id));
      let seq = 0;

      return prev.map((inv) => {
        if (!ids.has(inv.id)) return inv;

        const dateStr = inv.date
          ? inv.date.replace(/-/g, '')
          : new Date(inv.file.lastModified).toISOString().slice(0, 10).replace(/-/g, '');
        const amtStr = inv.totalAmount > 0 ? inv.totalAmount.toFixed(2) : '000.00';
        seq++;

        return { ...inv, fileName: `${dateStr}-${amtStr}-${String(seq).padStart(3, '0')}.pdf` };
      });
    });
  }, []);

  const handleExport = useCallback(() => {
    const toExport = invoices.filter((inv) => inv.selected);
    if (toExport.length === 0) {
      setPrintStatus('⚠️ 请先选择要导出的文件');
      setPrintStatusVisible(true);
      setTimeout(() => setPrintStatusVisible(false), 3000);
      return;
    }
    for (let i = 0; i < toExport.length; i++) {
      setTimeout(() => {
        const url = URL.createObjectURL(toExport[i].file);
        const a = document.createElement('a');
        a.href = url;
        a.download = toExport[i].fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, i * 150);
    }
    setPrintStatus(`✅ 已导出 ${toExport.length} 个文件`);
    setPrintStatusVisible(true);
    setTimeout(() => setPrintStatusVisible(false), 4000);
  }, [invoices]);

  const handleExportFolder = useCallback(async (folderName: string) => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();

    const folderInvoices = invoices.filter((inv) => {
      if (inv.source !== 'folder') return false;
      return inv.file.webkitRelativePath?.startsWith(folderName + '/');
    });
    if (folderInvoices.length === 0) return;

    // Compute beautified filenames on-the-fly (same logic as handleBeautifyFolder)
    const sorted = [...folderInvoices].sort((a, b) => {
      const da = a.date || '9999-99-99';
      const db = b.date || '9999-99-99';
      if (da !== db) return da.localeCompare(db);
      return a.totalAmount - b.totalAmount;
    });

    const fileNameMap = new Map<string, string>();

    for (let i = 0; i < sorted.length; i++) {
      const inv = sorted[i];
      const dateStr = inv.date
        ? inv.date.replace(/-/g, '')
        : new Date(inv.file.lastModified).toISOString().slice(0, 10).replace(/-/g, '');
      const amtStr = inv.totalAmount > 0 ? inv.totalAmount.toFixed(2) : '000.00';
      fileNameMap.set(inv.id, `${dateStr}-${amtStr}-${String(i + 1).padStart(3, '0')}.pdf`);
    }

    // Compute beautified folder names per subfolder
    const first = sorted[0];
    const firstDate = first?.date || (first ? new Date(first.file.lastModified).toISOString().slice(0, 10) : null);
    const firstDateCompact = (firstDate || '').replace(/-/g, '');
    const globalDateStr = firstDateCompact.slice(0, 6); // YYYYMM
    const folderTotal = folderInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const folderAmtStr = folderTotal > 0 ? folderTotal.toFixed(2) : '';
    const zipName = globalDateStr && folderAmtStr ? `${globalDateStr}-${folderAmtStr}.zip` : `${folderName}.zip`;
    const hasDate = firstDate && firstDate !== '0000-00-00';

    // Build map: each subfolder path → { yyyymm, yyyy } from its own files' dates
    const folderDateMap = new Map<string, { yyyymm: string; yyyy: string }>();
    for (const inv of sorted) {
      const rel = inv.file.webkitRelativePath;
      if (!rel.startsWith(folderName + '/')) continue;
      const relParts = rel.slice((folderName + '/').length).split('/');
      // For each subfolder that is distance=1 or distance=2 from the file
      if (relParts.length >= 2) {
        // Parent folder (distance=1)
        const parentPath = folderName + '/' + relParts.slice(0, -1).join('/');
        if (!folderDateMap.has(parentPath)) {
          const invDate = inv.date
            ? inv.date.replace(/-/g, '')
            : new Date(inv.file.lastModified).toISOString().slice(0, 10).replace(/-/g, '');
          folderDateMap.set(parentPath, { yyyymm: invDate.slice(0, 6), yyyy: invDate.slice(0, 4) });
        }
      }
      if (relParts.length >= 3) {
        // Grandparent folder (distance=2)
        const gpPath = folderName + '/' + relParts.slice(0, -2).join('/');
        if (!folderDateMap.has(gpPath)) {
          const invDate = inv.date
            ? inv.date.replace(/-/g, '')
            : new Date(inv.file.lastModified).toISOString().slice(0, 10).replace(/-/g, '');
          folderDateMap.set(gpPath, { yyyymm: invDate.slice(0, 6), yyyy: invDate.slice(0, 4) });
        }
      }
    }

    for (const inv of folderInvoices) {
      const buffer = await inv.file.arrayBuffer();
      const relPath = inv.file.webkitRelativePath;
      const relativeToExport = relPath.startsWith(folderName + '/')
        ? relPath.slice((folderName + '/').length)
        : inv.fileName;
      const parts = relativeToExport.split('/');
      const beautifiedName = fileNameMap.get(inv.id) || inv.fileName;

      // Build ZIP path: for each segment, look up beautified name from folderDateMap
      const zipParts: string[] = [];
      let currentPath = folderName;

      for (let i = 0; i < parts.length; i++) {
        const isLast = i === parts.length - 1;
        currentPath = currentPath + '/' + parts[i];

        if (isLast) {
          zipParts.push(beautifiedName);
        } else if (folderDateMap.has(currentPath)) {
          const { yyyymm, yyyy } = folderDateMap.get(currentPath)!;
          const distFromEnd = parts.length - 1 - i;
          // Replicate the same distance-based naming as handleBeautify
          if (distFromEnd === 1) {
            zipParts.push(yyyymm); // YYYYMM
          } else {
            zipParts.push(yyyy);   // YYYY
          }
        } else {
          zipParts.push(parts[i]);
        }
      }

      // If file is directly in exported folder, wrap in YYYYMM from nearest file
      if (zipParts.length === 1 && hasDate) {
        zipParts.unshift(globalDateStr);
      }

      zip.file(zipParts.join('/'), buffer);
    }

    // Also update the display names in state
    setInvoices((prev) =>
      prev.map((inv) => {
        const newName = fileNameMap.get(inv.id);
        return newName ? { ...inv, fileName: newName } : inv;
      })
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setPrintStatus(`✅ 已导出 ${folderName}（${folderInvoices.length} 个文件）`);
    setPrintStatusVisible(true);
    setTimeout(() => setPrintStatusVisible(false), 4000);
  }, [invoices]);

  const handleRemoveFolder = useCallback((folderName: string) => {
    setInvoices((prev) =>
      prev.filter((inv) => {
        if (inv.source !== 'folder') return true; // keep non-folder items
        return !inv.file.webkitRelativePath?.startsWith(folderName + '/');
      })
    );
  }, []);

  const handlePrint = useCallback(() => {
    const toPrint = invoices.filter((inv) => inv.selected);
    if (toPrint.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPrintStatus('⚠️ 浏览器弹窗被拦截，请允许弹出窗口后重试');
      setPrintStatusVisible(true);
      setTimeout(() => setPrintStatusVisible(false), 4000);
      return;
    }

    const {
      orientation, paperSize, margins, grayscale, layout,
      addCutLine, autoCenter, autoRotate, copies, customScale,
      scaleMode, hideBackground, collate, printer,
    } = settings;
    const printerLabel = printer || '系统打印对话框';

    const isLandscape = orientation === 'landscape';
    const paperDims: Record<string, { w: number; h: number }> = {
      A3: { w: 297, h: 420 }, A4: { w: 210, h: 297 },
      A5: { w: 148, h: 210 }, B5: { w: 176, h: 250 },
      Letter: { w: 216, h: 279 },
    };
    const paper = paperDims[paperSize] || paperDims.A4;
    const pageW = isLandscape ? paper.h : paper.w;
    const pageH = isLandscape ? paper.w : paper.h;

    let cols = 1, rows = 1;
    if (layout === '1x2') { cols = 2; rows = 1; }
    if (layout === '2x2') { cols = 2; rows = 2; }

    const cellW = (pageW - margins.left - margins.right) / cols;
    const cellH = (pageH - margins.top - margins.bottom) / rows;

    let scale = 1;
    if (scaleMode === 'custom') scale = customScale / 100;
    if (scaleMode === 'shrink') scale = 0.95;

    // Collect all pages
    const allPages: string[] = [];
    for (const inv of toPrint) {
      for (const page of inv.pages) {
        allPages.push(page);
      }
    }

    const perSheet = cols * rows;
    const sheets: string[][] = [];
    for (let i = 0; i < allPages.length; i += perSheet) {
      sheets.push(allPages.slice(i, i + perSheet));
    }

    // Build ordered sheets based on collation
    const orderedSheets: string[][] = [];
    if (collate) {
      // Collated: complete set, then repeat
      for (let c = 0; c < copies; c++) {
        for (const sheet of sheets) {
          orderedSheets.push(sheet);
        }
      }
    } else {
      // Uncollated: each sheet repeated n times
      for (const sheet of sheets) {
        for (let c = 0; c < copies; c++) {
          orderedSheets.push(sheet);
        }
      }
    }

    const rotateCSS = autoRotate ? `
      .cell img.rotate { transform: scale(${scale}) rotate(90deg); transform-origin: center center; }
    ` : '';

    let html = `<!DOCTYPE html><html><head><title>打印发票 - ${printerLabel}</title><style>
      @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { ${grayscale ? 'filter: grayscale(100%);' : ''} }
      .sheet {
        width: ${pageW}mm; height: ${pageH}mm;
        padding: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
        page-break-after: always;
        display: grid;
        grid-template-columns: repeat(${cols}, 1fr);
        grid-template-rows: repeat(${rows}, 1fr);
        gap: 0;
        ${hideBackground ? 'background: white;' : ''}
      }
      .sheet:last-child { page-break-after: auto; }
      .cell {
        display: flex;
        ${autoCenter ? 'align-items: center; justify-content: center;' : ''}
        overflow: hidden;
        position: relative;
        ${addCutLine ? 'border: 0.5px dashed #bbb;' : ''}
      }
      .cell img {
        max-width: ${cellW}mm;
        max-height: ${cellH}mm;
        ${scaleMode === 'actual' ? 'width: auto; height: auto;' : `object-fit: contain; transform: scale(${scale}); transform-origin: center center;`}
      }
      ${rotateCSS}
    </style></head><body>`;

    for (const sheet of orderedSheets) {
      html += `<div class="sheet">`;
      for (let idx = 0; idx < perSheet; idx++) {
        html += `<div class="cell">`;
        if (sheet[idx]) {
          html += `<img src="${sheet[idx]}" />`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setPrintStatus(`✅ 已生成打印任务：${toPrint.length} 张发票，${copies} 份，${printerLabel}`);
      setPrintStatusVisible(true);
      setTimeout(() => setPrintStatusVisible(false), 4000);
      setTimeout(() => printWindow.print(), 400);
    };
  }, [invoices, settings]);

  return (
    <div
      className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        ref={folderInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as any)}
        onChange={handleFolderChange}
      />

      <TitleBar title="PDF发票打印" />

      {/* Print status toast */}
      {printStatusVisible && (
        <div className="h-10 bg-blue-50 border-b border-blue-200 flex items-center justify-center text-sm text-blue-700 font-medium animate-pulse">
          {printStatus}
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <InvoiceListView
          invoices={invoices}
          settings={settings}
          onSettingsChange={setSettings}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onRemoveInvoice={handleRemoveInvoice}
          onAddFiles={handleAddFiles}
          onAddFolder={handleAddFolder}
          onClearAll={handleClearAll}
          onUpdateAmount={handleUpdateAmount}
          onPrint={handlePrint}
          onBatchSettings={() => setShowSettingsModal(true)}
          onBeautifyFolder={handleBeautifyFolder}
          onRemoveFolder={handleRemoveFolder}
          onExport={handleExport}
          onExportFolder={handleExportFolder}
          loading={loading}
        />

        {/* Loading indicator */}
        {loading && (
          <div className="absolute bottom-0 left-0 right-0 h-9 bg-white/90 border-t border-gray-200 flex items-center justify-center gap-2 z-50 text-sm">
            <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-gray-600">正在解析PDF文件...</span>
          </div>
        )}
      </div>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSettingsChange={setSettings}
        totalInvoices={invoices.length}
        selectedInvoices={selectedInvoices.length}
        selectedTotal={selectedTotal}
        onPrint={handlePrint}
      />
    </div>
  );
}
