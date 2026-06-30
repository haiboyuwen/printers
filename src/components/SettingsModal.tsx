import { PrintSettings } from '../types';
import PrintSettingsPanel from './PrintSettingsPanel';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
  totalInvoices: number;
  selectedInvoices: number;
  selectedTotal: number;
  onPrint: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  totalInvoices,
  selectedInvoices,
  selectedTotal,
  onPrint,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">批量打印设置</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <PrintSettingsPanel
            settings={settings}
            onChange={onSettingsChange}
            totalInvoices={totalInvoices}
            selectedInvoices={selectedInvoices}
            selectedTotal={selectedTotal}
            mode="modal"
            onClose={onClose}
            onPrint={onPrint}
          />
        </div>
      </div>
    </div>
  );
}
