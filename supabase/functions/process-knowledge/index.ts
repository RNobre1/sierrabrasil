import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// File reference detection
// ---------------------------------------------------------------------------

/** Patterns that indicate content is a file-reference placeholder, not real text */
const FILE_REF_PATTERNS = [
  /^\[Documento enviado: "/,
  /^\[Formato \.\w+ não suportado/,
  /^\[PDF escaneado ou sem texto/,
  /^\[Erro ao ler arquivo/,
  /^\[Erro ao processar arquivo/,
];

/**
 * Strip the "📎 Arquivo: filename.ext\n\n" prefix from content so we only
 * process the actual text body.
 */
function stripFilePrefix(content: string): string {
  const match = content.match(/^📎 Arquivo: .+?\n\n([\s\S]+)$/);
  return match ? match[1] : content;
}

/** Returns true when content is a placeholder reference, not extractable text. */
function isFileReference(content: string): boolean {
  const stripped = stripFilePrefix(content);
  return (
    FILE_REF_PATTERNS.some((p) => p.test(content)) ||
    FILE_REF_PATTERNS.some((p) => p.test(stripped))
  );
}

// ---------------------------------------------------------------------------
// Chunking with overlap and table awareness
// ---------------------------------------------------------------------------

/** Heuristic: line looks like a table row (currency, multiple numbers, aligned columns) */
function looksLikeTable(line: string): boolean {
  const hasCurrency = /R\$\s*[\d.,]+/.test(line);
  const hasMultipleNumbers = (line.match(/\d+[.,]?\d*/g) || []).length >= 2;
  const hasAlignment = /\t|\s{3,}/.test(line);
  return (hasCurrency || hasMultipleNumbers) && hasAlignment;
}

/**
 * Chunk text into pieces of up to `maxChunk` characters with `overlap`
 * characters of overlap between consecutive chunks.
 *
 * Table sections (lines with numbers/currency/columns) are kept as a single
 * chunk even when they exceed maxChunk, up to `maxTable` characters.
 */
function chunkText(
  text: string,
  maxChunk = 1000,
  overlap = 150,
  maxTable = 2000
): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];

  // --- Pass 1: group lines into table / non-table sections ---
  const sections: { text: string; isTable: boolean }[] = [];
  let sectionBuf = "";
  let sectionIsTable = false;

  for (const line of lines) {
    const lineIsTable = looksLikeTable(line);

    if (lineIsTable !== sectionIsTable && sectionBuf.trim()) {
      sections.push({ text: sectionBuf.trim(), isTable: sectionIsTable });
      sectionBuf = "";
    }

    sectionIsTable = lineIsTable;
    sectionBuf += line + "\n";
  }
  if (sectionBuf.trim()) {
    sections.push({ text: sectionBuf.trim(), isTable: sectionIsTable });
  }

  // --- Pass 2: chunk each section ---
  for (const section of sections) {
    // Keep small table sections as a single chunk
    if (section.isTable && section.text.length <= maxTable) {
      chunks.push(section.text);
      continue;
    }

    // Split on sentence boundaries (non-table) or newlines (table)
    const delimiter = section.isTable ? /\n/ : /(?<=[.!?\n])\s+/;
    const fragments = section.text.split(delimiter);
    let current = "";

    for (const frag of fragments) {
      const sep = section.isTable ? "\n" : " ";
      const candidate = current ? current + sep + frag : frag;

      if (candidate.length > maxChunk && current.length > 0) {
        chunks.push(current.trim());

        // Build overlap prefix from the tail of the chunk we just pushed
        if (overlap > 0 && current.length > overlap) {
          const tail = current.slice(-overlap);
          const wordBreak = tail.indexOf(" ");
          const overlapPrefix = wordBreak >= 0 ? tail.slice(wordBreak + 1) : tail;
          current = overlapPrefix + sep + frag;
        } else {
          current = frag;
        }
      } else {
        current = candidate;
      }
    }

    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 0);
}

// ---------------------------------------------------------------------------
// Source priority
// ---------------------------------------------------------------------------

function getSourcePriority(sourceType: string): number {
  switch (sourceType) {
    case "document":
      return 100;
    case "manual":
      return 90;
    case "website":
      return 70;
    case "social":
      return 10;
    default:
      return 50;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { tenantId, attendantId, content, sourceName, sourceType, sourceUrl } =
      await req.json();

    if (!tenantId || !content) {
      return new Response(
        JSON.stringify({ error: "tenantId and content are required" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // --- Guard: reject file-reference placeholders ---
    if (isFileReference(content)) {
      console.warn(
        `Skipping file reference (no real content) for "${sourceName}" — tenant ${tenantId}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "file_reference_only",
          message:
            "O conteúdo recebido é apenas uma referência ao arquivo, não o texto extraído. " +
            "Envie o conteúdo de texto extraído do documento.",
          source: sourceName,
        }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Strip emoji file prefix if present
    const cleanContent = stripFilePrefix(content);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const effectiveSourceType = sourceType || "document";
    const sourcePriority = getSourcePriority(effectiveSourceType);
    const chunks = chunkText(cleanContent);

    console.log(
      `Processing ${chunks.length} chunks from "${sourceName}" ` +
        `(type=${effectiveSourceType}, priority=${sourcePriority}) for tenant ${tenantId}`
    );

    // Insert all chunks with source_priority column
    // (added via migration 20260402120000_add_knowledge_base_priority_and_archived)
    const rows = chunks.map((chunk, i) => ({
      tenant_id: tenantId,
      attendant_id: attendantId || null,
      source_type: effectiveSourceType,
      source_url: sourceUrl || null,
      source_name: sourceName || "Documento",
      content: chunk,
      chunk_index: i,
      source_priority: sourcePriority,
      metadata: { total_chunks: chunks.length },
    }));

    const { error } = await supabase.from("knowledge_base").insert(rows);
    if (error) {
      console.error("Insert error:", error);
      throw new Error(error.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: chunks.length,
        source: sourceName,
        source_priority: sourcePriority,
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-knowledge error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
