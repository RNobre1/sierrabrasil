import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Fetch a URL and extract text content */
async function scrapeUrl(url: string): Promise<{ text: string; title: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MeteoraBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const html = await resp.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : url;

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";

    // Extract OG tags
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);

    // Strip HTML tags to get text content
    let text = html
      // Remove script/style blocks
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim();

    // Limit to first 5000 chars of body text
    text = text.slice(0, 5000);

    // Build structured content
    const parts = [
      `FONTE: ${url}`,
      title ? `TÍTULO: ${title}` : "",
      ogTitleMatch ? `OG TITLE: ${ogTitleMatch[1].trim()}` : "",
      metaDesc ? `DESCRIÇÃO: ${metaDesc}` : "",
      ogDescMatch ? `OG DESCRIPTION: ${ogDescMatch[1].trim()}` : "",
      `\nCONTEÚDO:\n${text}`,
    ].filter(Boolean);

    return { text: parts.join("\n"), title };
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

/** Use AI to summarize/extract structured info from scraped content */
async function extractWithAI(content: string, url: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return content; // fallback to raw content

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um extrator de informações de negócios. Dado o conteúdo scrapeado de uma URL, extraia e organize TODAS as informações relevantes sobre o negócio em formato estruturado. Inclua:
- Nome do negócio
- Descrição / sobre
- Produtos e serviços (com preços se disponível)
- Horários de funcionamento  
- Endereço / localização
- Contatos (telefone, email, WhatsApp)
- Redes sociais
- Diferenciais
- Qualquer outra informação útil para um atendente virtual

Responda APENAS com as informações extraídas, sem comentários extras. Se não encontrar algo, omita a seção.`,
          },
          {
            role: "user",
            content: `URL: ${url}\n\nConteúdo scrapeado:\n${content.slice(0, 8000)}`,
          },
        ],
      }),
    });

    if (!resp.ok) return content;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || content;
  } catch {
    return content;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { urls, tenantId, attendantId } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0 || !tenantId) {
      return new Response(JSON.stringify({ error: "urls array and tenantId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: { url: string; status: string; title?: string; chunks?: number }[] = [];

    for (const url of urls) {
      try {
        console.log(`Scraping: ${url}`);
        const { text, title } = await scrapeUrl(url);
        
        // Use AI to extract structured info
        console.log(`Extracting info with AI for: ${url}`);
        const enrichedContent = await extractWithAI(text, url);

        // Determine source type from URL
        let sourceType = "website";
        if (url.includes("instagram.com")) sourceType = "social";
        else if (url.includes("facebook.com")) sourceType = "social";
        else if (url.includes("linkedin.com")) sourceType = "social";
        else if (url.includes("tiktok.com")) sourceType = "social";
        else if (url.includes("youtube.com") || url.includes("youtu.be")) sourceType = "social";
        else if (url.includes("twitter.com") || url.includes("x.com")) sourceType = "social";

        // Chunk and store
        const chunks = chunkContent(enrichedContent);
        const rows = chunks.map((chunk, i) => ({
          tenant_id: tenantId,
          attendant_id: attendantId || null,
          source_type: sourceType,
          source_url: url,
          source_name: title || url,
          content: chunk,
          chunk_index: i,
          metadata: { total_chunks: chunks.length, scraped_at: new Date().toISOString() },
        }));

        const { error } = await supabase.from("knowledge_base").insert(rows);
        if (error) {
          console.error(`Insert error for ${url}:`, error);
          results.push({ url, status: "error" });
        } else {
          results.push({ url, status: "success", title, chunks: chunks.length });
        }
      } catch (e) {
        console.error(`Failed to scrape ${url}:`, e);
        results.push({ url, status: "error" });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-urls error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function chunkContent(text: string, maxChunk = 600): string[] {
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
