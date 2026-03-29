import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Chunk text into ~500 char pieces at sentence boundaries */
function chunkText(text: string, maxChunk = 500): string[] {
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const s of sentences) {
    if ((current + " " + s).length > maxChunk && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? " " : "") + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenantId, attendantId, content, sourceName, sourceType, sourceUrl } = await req.json();

    if (!tenantId || !content) {
      return new Response(JSON.stringify({ error: "tenantId and content are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Chunk the content
    const chunks = chunkText(content);
    console.log(`Processing ${chunks.length} chunks from "${sourceName}" for tenant ${tenantId}`);

    // Insert all chunks
    const rows = chunks.map((chunk, i) => ({
      tenant_id: tenantId,
      attendant_id: attendantId || null,
      source_type: sourceType || "document",
      source_url: sourceUrl || null,
      source_name: sourceName || "Documento",
      content: chunk,
      chunk_index: i,
      metadata: { total_chunks: chunks.length },
    }));

    const { error } = await supabase.from("knowledge_base").insert(rows);
    if (error) {
      console.error("Insert error:", error);
      throw new Error(error.message);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      chunks_created: chunks.length,
      source: sourceName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-knowledge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
