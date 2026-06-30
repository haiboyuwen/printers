import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
// Use bundled worker from CDN, version auto-synced via Vite define
declare const __PDFJS_VERSION__: string;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${__PDFJS_VERSION__}/pdf.worker.min.mjs`;

export interface ParsedPDF {
  pageCount: number;
  pages: string[];      // data URL per page
  thumbnail: string;    // first page small
  textContent: string;  // extracted text for amount detection
  date?: string;        // YYYY-MM-DD extracted invoice date
}

export async function parsePDFFile(file: File): Promise<ParsedPDF> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${__PDFJS_VERSION__}/cmaps/`,
    cMapPacked: true,
  }).promise;
  const pageCount = pdf.numPages;

  const pages: string[] = [];
  let allText = '';

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);

    // Render full page
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    pages.push(canvas.toDataURL('image/png'));

    // Extract text
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    allText += pageText + '\n';

    canvas.remove();
  }

  // Generate thumbnail from first page
  const thumbPage = await pdf.getPage(1);
  const thumbViewport = thumbPage.getViewport({ scale: 0.3 });
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbViewport.width;
  thumbCanvas.height = thumbViewport.height;
  const thumbCtx = thumbCanvas.getContext('2d')!;
  await thumbPage.render({ canvasContext: thumbCtx, viewport: thumbViewport }).promise;
  const thumbnail = thumbCanvas.toDataURL('image/png');
  thumbCanvas.remove();

  const date = extractDate(allText);
  return { pageCount, pages, thumbnail, textContent: allText, date: date ?? undefined };
}

/**
 * Try to extract invoice amount from PDF text.
 * Handles Chinese electronic invoices (电子发票/增值税发票).
 *
 * Strategy (in order of reliability):
 *   1. Chinese uppercase amount (大写) anywhere in text — 捌佰陆拾陆圆玖角整 → 866.90
 *   2.  小写 near a ¥ amount
 *   3. Keyword "合计"/"总计" followed by ¥ amount
 *   4. Largest ¥ amount in document (skips tiny tax amounts)
 */
export function extractAmount(text: string): number {
  // 1. Chinese uppercase amount (大写) — most reliable, search anywhere in text
  const cnMatch = text.match(
    /[零壹贰叁肆伍陆柒捌玖拾佰仟万]+[圆元⺎](?:[零壹贰叁肆伍陆柒捌玖]*[角⻆])?(?:[零壹贰叁肆伍陆柒捌玖]*[分])?整?/
  );
  if (cnMatch) {
    const val = parseChineseAmount(cnMatch[0]);
    if (val > 0) return val;
  }

  // 2. "（小写）" or "小写)" followed by ¥ amount
  const xiaoxieMatch = text.match(/小写[\s）)\S]*?[¥￥]\s*([\d,]+\.\d{2})/);
  if (xiaoxieMatch) {
    const val = parseFloat(xiaoxieMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
  }

  // 3. Keyword patterns — 合计/总计 followed by the nearest ¥ amount
  const kwPatterns = [
    /合\s*计[\s\S]*?[¥￥]\s*([\d,]+\.?\d*)/,
    /金额合计[\s\S]*?[¥￥]\s*([\d,]+\.?\d*)/,
    /总\s*计[\s\S]*?[¥￥]\s*([\d,]+\.?\d*)/,
  ];
  for (const pattern of kwPatterns) {
    const match = text.match(pattern);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // 4. Fallback: pick the largest ¥ amount (total is usually the largest)
  const allMatches = [...text.matchAll(/[¥￥]\s*([\d,]+\.\d{2})/g)];
  if (allMatches.length > 0) {
    let best = 0;
    for (const m of allMatches) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(v) && v > best) best = v;
    }
    if (best > 0) return best;
  }

  return 0;
}

/**
 * Extract invoice date from PDF text.
 * Handles Chinese electronic invoice date formats.
 *
 * Strategy (in order of reliability):
 *   1. Keyword "开票日期"/"发票日期" followed by date
 *   2. First Chinese date format (2026年04月26日 / 2026-04-26 / 2026/04/26)
 *   3. ISO date (2026-04-26) with word boundaries
 */
export function extractDate(text: string): string | null {
  // 1. Keyword patterns — most specific
  const kwPatterns = [
    /[开具出收]票?日期[：:]?\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日]?/,
    /发票日期[：:]?\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日]?/,
    /收款日期[：:]?\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日]?/,
    /付款日期[：:]?\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日]?/,
  ];
  for (const pattern of kwPatterns) {
    const m = text.match(pattern);
    if (m) {
      const [, y, mo, d] = m;
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  // 2. First Chinese date format match (2026年04月26日, 2026-04-26, 2026/04/26, 2026.04.26)
  const cnMatch = text.match(/(\d{4})[年/.\-](\d{1,2})[月/.\-](\d{1,2})[日]?/);
  if (cnMatch) {
    const [, y, mo, d] = cnMatch;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 3. ISO date with word boundaries
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const [, y, mo, d] = isoMatch;
    return `${y}-${mo}-${d}`;
  }

  return null;
}

/**
 * Parse Chinese uppercase amount (大写金额) into a number.
 * E.g. "捌佰陆拾陆圆玖角整" → 866.9, "壹仟贰佰叁拾肆元伍角陆分" → 1234.56
 *     "伍拾肆圆整" → 54
 */
function parseChineseAmount(cn: string): number {
  const numMap: Record<string, number> = {
    零: 0, 壹: 1, 贰: 2, 叁: 3, 肆: 4,
    伍: 5, 陆: 6, 柒: 7, 捌: 8, 玖: 9,
  };

  // Split at 圆/元/⺎ — before is the integer part
  const sepIdx = cn.search(/[圆元⺎]/);
  if (sepIdx === -1) return 0;

  const yuanStr = cn.slice(0, sepIdx);
  const rest = cn.slice(sepIdx + 1); // after 圆/元, e.g. "玖角整" or "整"

  // Parse yuan (integer) part
  let yuan = 0;
  let cur = 0;
  for (let i = 0; i < yuanStr.length; i++) {
    const ch = yuanStr[i];
    if (numMap[ch] !== undefined) {
      cur = numMap[ch];
    } else if (ch === '拾') {
      cur = Math.max(cur, 1) * 10;
      yuan += cur;
      cur = 0;
    } else if (ch === '佰') {
      cur = Math.max(cur, 1) * 100;
      yuan += cur;
      cur = 0;
    } else if (ch === '仟') {
      cur = Math.max(cur, 1) * 1000;
      yuan += cur;
      cur = 0;
    } else if (ch === '万') {
      yuan = (yuan + cur) * 10000;
      cur = 0;
    }
  }
  yuan += cur;

  // Parse jiao (角/⻆) — the character just before 角/⻆
  let jiao = 0;
  const jiaoIdx = rest.search(/[零壹贰叁肆伍陆柒捌玖][角⻆]/);
  if (jiaoIdx !== -1) {
    jiao = numMap[rest[jiaoIdx]] || 0;
  }

  // Parse fen (分) — the character just before 分
  let fen = 0;
  const fenIdx = rest.search(/[零壹贰叁肆伍陆柒捌玖]分/);
  if (fenIdx !== -1) {
    fen = numMap[rest[fenIdx]] || 0;
  }

  return parseFloat((yuan + jiao / 10 + fen / 100).toFixed(2));
}
