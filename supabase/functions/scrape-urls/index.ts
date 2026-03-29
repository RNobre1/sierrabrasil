import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Apify actor IDs for each platform
const APIFY_ACTORS: Record<string, string> = {
  instagram: "apify/instagram-profile-scraper",
  facebook: "apify/facebook-pages-scraper",
  tiktok: "clockworks/tiktok-profile-scraper",
  youtube: "streamers/youtube-channel-scraper",
  linkedin: "anchor/linkedin-company-scraper",
  website: "apify/website-content-crawler",
};

function detectPlatform(url: string): string {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("facebook.com") || url.includes("fb.com")) return "facebook";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("linkedin.com")) return "linkedin";
  return "website";
}

function buildApifyInput(platform: string, url: string): any {
  switch (platform) {
    case "instagram":
      return { usernames: [url.replace(/.*instagram\.com\//, "").replace(/[\/?#].*/, "")], resultsLimit: 30 };
    case "facebook":
      return { startUrls: [{ url }], maxPagesPerQuery: 1 };
    case "tiktok":
      return { profiles: [url], resultsPerPage: 20 };
    case "youtube":
      return { startUrls: [{ url }], maxResults: 20 };
    case "linkedin":
      return { startUrls: [{ url }] };
    case "website":
    default:
      return { 
        startUrls: [{ url }], 
        maxCrawlPages: 10,
        crawlerType: "cheerio",
        maxCrawlDepth: 2,
      };
  }
}

/** Chunk text into ~600 char pieces at sentence boundaries */
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

/** Fallback: simple fetch scraping */
async function simpleScrape(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MeteoraBot/1.0)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || url;
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)?.[1]?.trim() || "";
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i)?.[1]?.trim() || "";
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim().slice(0, 5000);
  return `FONTE: ${url}\nTÍTULO: ${title}\n${metaDesc ? `DESCRIÇÃO: ${metaDesc}\n` : ""}${ogDesc ? `OG: ${ogDesc}\n` : ""}\nCONTEÚDO:\n${text}`;
}

/** Run Apify actor and wait for results */
async function runApifyActor(actorId: string, input: any, apiKey: string): Promise<any[]> {
  console.log(`Starting Apify actor: ${actorId}`);
  
  // Start actor run
  const runResp = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}&waitForFinish=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runResp.ok) {
    const err = await runResp.text();
    console.error(`Apify run failed: ${runResp.status} ${err}`);
    throw new Error(`Apify actor start failed: ${runResp.status}`);
  }

  const runData = await runResp.json();
  const datasetId = runData.data?.defaultDatasetId;
  if (!datasetId) throw new Error("No dataset returned");

  console.log(`Apify run completed, fetching dataset: ${datasetId}`);

  // Fetch results
  const dataResp = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=50`
  );
  if (!dataResp.ok) throw new Error(`Dataset fetch failed: ${dataResp.status}`);
  
  return await dataResp.json();
}

/** Use AI to extract structured business info from scraped data */
async function enrichWithAI(rawData: string, url: string, platform: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return rawData;

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
            content: `Você é um extrator de informações de negócios expert. Dado dados scrapeados de ${platform} (${url}), extraia e organize TODAS as informações relevantes sobre o negócio de forma clara e estruturada.

Organize em seções como:
- SOBRE O NEGÓCIO (nome, descrição, posicionamento)
- PRODUTOS/SERVIÇOS (lista detalhada, preços se disponível)
- LOCALIZAÇÃO/CONTATO
- HORÁRIOS DE FUNCIONAMENTO
- DEPOIMENTOS/AVALIAÇÕES
- ESTILO DE COMUNICAÇÃO (como se comunicam nas redes)
- HASHTAGS E PALAVRAS-CHAVE
- POSTS RELEVANTES (temas recorrentes, promoções)
- DIFERENCIAIS

Seja detalhista. Capture TUDO que um atendente virtual precisaria saber.
Responda APENAS com as informações extraídas.`,
          },
          { role: "user", content: `Dados de ${platform} (${url}):\n\n${rawData.slice(0, 12000)}` },
        ],
      }),
    });
    if (!resp.ok) return rawData;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || rawData;
  } catch {
    return rawData;
  }
}

/** Format Apify results into text based on platform */
function formatApifyResults(platform: string, items: any[], url: string): string {
  if (!items || items.length === 0) return "";

  switch (platform) {
    case "instagram": {
      const profile = items[0];
      const parts = [
        `INSTAGRAM: ${url}`,
        profile.fullName ? `Nome: ${profile.fullName}` : "",
        profile.biography ? `Bio: ${profile.biography}` : "",
        profile.followersCount ? `Seguidores: ${profile.followersCount}` : "",
        profile.followsCount ? `Seguindo: ${profile.followsCount}` : "",
        profile.postsCount ? `Posts: ${profile.postsCount}` : "",
        profile.isBusinessAccount ? `Conta Business: Sim` : "",
        profile.businessCategory ? `Categoria: ${profile.businessCategory}` : "",
        profile.businessEmail ? `Email: ${profile.businessEmail}` : "",
        profile.businessPhone ? `Telefone: ${profile.businessPhone}` : "",
        profile.externalUrl ? `Site: ${profile.externalUrl}` : "",
      ].filter(Boolean);

      // Recent posts
      const posts = items.filter(i => i.caption || i.type === "Image" || i.type === "Video");
      if (posts.length > 0) {
        parts.push("\nPOSTS RECENTES:");
        posts.slice(0, 15).forEach((p, i) => {
          parts.push(`${i + 1}. ${(p.caption || p.alt || "").slice(0, 300)}${p.likesCount ? ` (❤️ ${p.likesCount})` : ""}${p.commentsCount ? ` (💬 ${p.commentsCount})` : ""}`);
        });
      }
      return parts.join("\n");
    }

    case "facebook": {
      const page = items[0];
      return [
        `FACEBOOK: ${url}`,
        page.title ? `Nome: ${page.title}` : "",
        page.description ? `Descrição: ${page.description}` : "",
        page.categories ? `Categorias: ${JSON.stringify(page.categories)}` : "",
        page.address ? `Endereço: ${JSON.stringify(page.address)}` : "",
        page.phone ? `Telefone: ${page.phone}` : "",
        page.email ? `Email: ${page.email}` : "",
        page.website ? `Site: ${page.website}` : "",
        page.hours ? `Horários: ${JSON.stringify(page.hours)}` : "",
        page.rating ? `Avaliação: ${page.rating}` : "",
        page.reviewCount ? `Avaliações: ${page.reviewCount}` : "",
        "\nPOSTS RECENTES:",
        ...items.slice(0, 10).map((p: any, i: number) => `${i + 1}. ${(p.text || p.message || "").slice(0, 300)}`),
      ].filter(Boolean).join("\n");
    }

    case "youtube": {
      return [
        `YOUTUBE: ${url}`,
        ...items.slice(0, 15).map((v: any, i: number) => 
          `${i + 1}. ${v.title || ""} ${v.viewCount ? `(${v.viewCount} views)` : ""}\n   ${(v.description || "").slice(0, 200)}`
        ),
      ].join("\n");
    }

    case "tiktok": {
      const profile = items[0];
      return [
        `TIKTOK: ${url}`,
        profile.authorMeta?.name ? `Nome: ${profile.authorMeta.name}` : "",
        profile.authorMeta?.nickName ? `Nick: ${profile.authorMeta.nickName}` : "",
        profile.authorMeta?.signature ? `Bio: ${profile.authorMeta.signature}` : "",
        profile.authorMeta?.fans ? `Seguidores: ${profile.authorMeta.fans}` : "",
        "\nVÍDEOS RECENTES:",
        ...items.slice(0, 15).map((v: any, i: number) =>
          `${i + 1}. ${(v.text || "").slice(0, 200)} (❤️ ${v.diggCount || 0}, 👁️ ${v.playCount || 0})`
        ),
      ].filter(Boolean).join("\n");
    }

    case "linkedin": {
      const co = items[0];
      return [
        `LINKEDIN: ${url}`,
        co.name ? `Nome: ${co.name}` : "",
        co.description ? `Descrição: ${co.description}` : "",
        co.industry ? `Indústria: ${co.industry}` : "",
        co.companySize ? `Tamanho: ${co.companySize}` : "",
        co.headquarters ? `Sede: ${JSON.stringify(co.headquarters)}` : "",
        co.specialties ? `Especialidades: ${co.specialties}` : "",
        co.website ? `Site: ${co.website}` : "",
      ].filter(Boolean).join("\n");
    }

    case "website":
    default: {
      return items.map((page: any, i: number) => 
        `PÁGINA ${i + 1}: ${page.url || ""}\n${(page.text || page.markdown || page.body || "").slice(0, 2000)}`
      ).join("\n\n---\n\n");
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { urls, tenantId, attendantId } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0 || !tenantId) {
      return new Response(JSON.stringify({ error: "urls array and tenantId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const results: { url: string; platform: string; status: string; chunks?: number; title?: string; details?: string }[] = [];

    for (const url of urls) {
      const platform = detectPlatform(url);
      try {
        let rawContent = "";

        if (APIFY_API_KEY && platform !== "website") {
          // Use Apify for social media - deep scraping
          const actorId = APIFY_ACTORS[platform] || APIFY_ACTORS.website;
          const input = buildApifyInput(platform, url);
          console.log(`[${platform}] Running Apify actor ${actorId} for ${url}`);
          
          try {
            const items = await runApifyActor(actorId, input, APIFY_API_KEY);
            rawContent = formatApifyResults(platform, items, url);
            console.log(`[${platform}] Apify returned ${items.length} items, ${rawContent.length} chars`);
          } catch (apifyErr) {
            console.warn(`[${platform}] Apify failed, falling back to simple scrape:`, apifyErr);
            rawContent = await simpleScrape(url);
          }
        } else if (APIFY_API_KEY && platform === "website") {
          // Use Apify website crawler for deeper website scraping
          try {
            const items = await runApifyActor(APIFY_ACTORS.website, buildApifyInput("website", url), APIFY_API_KEY);
            rawContent = formatApifyResults("website", items, url);
          } catch {
            rawContent = await simpleScrape(url);
          }
        } else {
          // No Apify key - simple scrape fallback
          rawContent = await simpleScrape(url);
        }

        if (!rawContent || rawContent.length < 20) {
          results.push({ url, platform, status: "empty", details: "Nenhum conteúdo extraído" });
          continue;
        }

        // Enrich with AI
        console.log(`[${platform}] Enriching ${rawContent.length} chars with AI...`);
        const enrichedContent = await enrichWithAI(rawContent, url, platform);

        // Chunk and store
        const chunks = chunkContent(enrichedContent);
        const rows = chunks.map((chunk, i) => ({
          tenant_id: tenantId,
          attendant_id: attendantId || null,
          source_type: platform === "website" ? "website" : "social",
          source_url: url,
          source_name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} - ${url.replace(/https?:\/\/(www\.)?/, "").slice(0, 50)}`,
          content: chunk,
          chunk_index: i,
          metadata: { total_chunks: chunks.length, platform, scraped_at: new Date().toISOString(), raw_length: rawContent.length },
        }));

        const { error } = await supabase.from("knowledge_base").insert(rows);
        if (error) {
          console.error(`[${platform}] DB insert error:`, error);
          results.push({ url, platform, status: "error", details: error.message });
        } else {
          results.push({ url, platform, status: "success", chunks: chunks.length, details: `${enrichedContent.length} chars processados` });
        }
      } catch (e) {
        console.error(`[${platform}] Failed for ${url}:`, e);
        results.push({ url, platform, status: "error", details: e instanceof Error ? e.message : "Unknown" });
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
