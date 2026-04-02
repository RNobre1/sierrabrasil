/**
 * Browser-side text extraction from uploaded files.
 *
 * Supported formats:
 * - PDF  → pdfjs-dist (renders each page and concatenates text)
 * - TXT / MD / CSV → read as UTF-8 text directly
 * - DOC / DOCX / XLS / XLSX → binary files that need specialised parsers;
 *   for MVP we flag them and return a placeholder so the user is informed.
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker from CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/** Result from extraction */
export interface ExtractionResult {
  text: string;
  /** true when the extraction actually produced meaningful content */
  extracted: boolean;
  /** Number of pages (PDF only) */
  pageCount?: number;
}

const TEXT_EXTENSIONS = [".txt", ".md", ".csv"];

/**
 * Returns true when the file extension indicates a plain-text format that can
 * be read with `file.text()`.
 */
function isPlainText(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Extract text from a PDF file using pdfjs-dist (runs entirely in the browser).
 */
async function extractPdfText(file: File): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Each item has a `str` property with the text fragment
    const pageText = content.items
      .map((item: { str?: string }) => item.str ?? "")
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

  return {
    text: fullText,
    extracted: true,
    pageCount: pdf.numPages,
  };
}

/**
 * Extract text content from a file.
 *
 * For plain text files, reads directly. For PDFs, uses pdfjs-dist.
 * For unsupported binary formats (DOC, DOCX, XLS, XLSX), returns a
 * descriptive placeholder asking the user to provide text manually.
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

  // Binary office formats — not extractable in browser without heavy libs
  const ext = name.split(".").pop() ?? "";
  const unsupported = ["doc", "docx", "xls", "xlsx"];
  if (unsupported.includes(ext)) {
    return {
      text: `[Formato .${ext} não suportado para extração automática: "${file.name}" (${(file.size / 1024).toFixed(1)}KB). Converta para PDF ou TXT, ou cole o conteúdo manualmente.]`,
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
