/**
 * Browser-side text extraction from uploaded files.
 *
 * Supported formats:
 * - PDF   → pdfjs-dist (renders each page and concatenates text)
 * - DOCX  → mammoth.js (extracts raw text from .docx)
 * - XLS/XLSX → SheetJS (converts spreadsheet to pipe-delimited text)
 * - TXT / MD / CSV → read as UTF-8 text directly
 * - DOC   → unsupported (old binary format, ask user to convert)
 */

// All heavy libs loaded via dynamic import to prevent production build crash
// (import * causes "can't access lexical declaration before initialization" in minified builds)
const importPdfjs = () => import("pdfjs-dist");
const importMammoth = () => import("mammoth");
const importXLSX = () => import("xlsx");

let pdfjsConfigured = false;

/** Result from extraction */
export interface ExtractionResult {
  text: string;
  /** true when the extraction actually produced meaningful content */
  extracted: boolean;
  /** Number of pages (PDF only) */
  pageCount?: number;
}

const TEXT_EXTENSIONS = [".txt", ".md", ".csv"];

function isPlainText(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Extract text from a PDF file using pdfjs-dist */
async function extractPdfText(file: File): Promise<ExtractionResult> {
  const pdfjsLib = await importPdfjs();
  if (!pdfjsConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    pdfjsConfigured = true;
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => (item as { str?: string }).str ?? "")
      .join(" ");
    if (pageText.trim()) {
      pages.push(pageText.trim());
    }
  }

  const fullText = pages.join("\n\n");
  if (!fullText.trim()) {
    return {
      text: `[PDF escaneado ou sem texto extraível: "${file.name}" (${(file.size / 1024).toFixed(1)}KB, ${pdf.numPages} páginas). Envie uma versão com texto digital ou cole o conteúdo manualmente.]`,
      extracted: false,
      pageCount: pdf.numPages,
    };
  }
  return { text: fullText, extracted: true, pageCount: pdf.numPages };
}

/** Extract text from a DOCX file using mammoth.js */
async function extractDocxText(file: File): Promise<ExtractionResult> {
  const mammoth = await importMammoth();
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value.trim();

  if (!text) {
    return {
      text: `[Documento DOCX vazio ou sem texto extraível: "${file.name}" (${(file.size / 1024).toFixed(1)}KB). Cole o conteúdo manualmente.]`,
      extracted: false,
    };
  }
  return { text, extracted: true };
}

/** Extract text from XLS/XLSX using SheetJS, converting to pipe-delimited format */
async function extractSpreadsheetText(file: File): Promise<ExtractionResult> {
  const XLSX = await importXLSX();
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const sheets: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: " | ", RS: "\n" });
    if (csv.trim()) {
      sheets.push(`### ${sheetName}\n${csv}`);
    }
  }

  const text = sheets.join("\n\n");
  if (!text.trim()) {
    return {
      text: `[Planilha vazia: "${file.name}" (${(file.size / 1024).toFixed(1)}KB).]`,
      extracted: false,
    };
  }
  return { text, extracted: true };
}

/**
 * Extract text content from a file.
 *
 * Routes to the appropriate extractor based on file extension.
 */
export async function extractFileText(file: File): Promise<ExtractionResult> {
  const name = file.name.toLowerCase();

  // Plain text files
  if (isPlainText(name)) {
    const text = await file.text();
    return { text, extracted: true };
  }

  // PDF
  if (name.endsWith(".pdf")) {
    return extractPdfText(file);
  }

  // DOCX
  if (name.endsWith(".docx")) {
    return extractDocxText(file);
  }

  // XLS / XLSX
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return extractSpreadsheetText(file);
  }

  // DOC (old binary format — mammoth doesn't support it reliably)
  if (name.endsWith(".doc")) {
    return {
      text: `[Formato .doc não suportado: "${file.name}" (${(file.size / 1024).toFixed(1)}KB). Converta para .docx ou PDF.]`,
      extracted: false,
    };
  }

  // Fallback: try reading as text
  try {
    const text = await file.text();
    return { text, extracted: true };
  } catch {
    return {
      text: `[Erro ao ler arquivo "${file.name}"]`,
      extracted: false,
    };
  }
}
