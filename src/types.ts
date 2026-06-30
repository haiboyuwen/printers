export interface InvoiceFile {
  id: string;
  file: File;
  fileName: string;
  pageCount: number;
  thumbnail: string; // data URL from canvas
  pages: string[];   // data URL per page
  totalAmount: number;
  selected: boolean;
  source: 'file' | 'folder';
  date?: string; // YYYY-MM-DD extracted from PDF text
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PrintSettings {
  // 打印机
  printer: string;
  // 基础
  tabMode: 'pageSize' | 'multiPage' | 'booklet';
  scaleMode: 'fit' | 'actual' | 'shrink' | 'custom';
  customScale: number;
  duplex: boolean;
  collate: boolean;
  // 页面设置
  copies: number;
  paperSize: string;
  orientation: 'portrait' | 'landscape' | 'auto';
  margins: PageMargins;
  grayscale: boolean;
  // 打印排版
  layout: '1x1' | '1x2' | '2x2';
  addCutLine: boolean;
  // 内容
  listLayout: string;
  printContent: string;
  autoCenter: boolean;
  autoRotate: boolean;
  hideBackground: boolean;
}

