import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Apify actors — using the fastest/cheapest tiers available
const APIFY_ACTORS: Record<string, string> = {
  instagram: "apify~instagram-profile-scraper",
  facebook: "apify~facebook-pages-scraper",
  tiktok: "clockworks~free-tiktok-scraper",
  youtube: "streamers~youtube-channel-scraper",
  linkedin: "anchor~linkedin-company-scraper",
  twitter: "apidojo~tweet-scraper",
  website: "apify~website-content-crawler",
  google_maps: "compass~crawler-google-places",
};

function detectPlatform(url: string): string {
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("facebook.com") || url.includes("fb.com")) return "facebook";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("google.com/maps") || url.includes("goo.gl/maps")) return "google_maps";
  return "website";
}

function buildApifyInput(platform: string, url: string): any {
  switch (platform) {
    case "instagram": {
      const username = url.replace(/.*instagram\.com\//, "").replace(/[\/?#@].*/, "").replace(/^@/, "");
      return {
        usernames: [username],
        resultsLimit: 30,
      };
    }
    case "facebook":
      return { startUrls: [{ url }], maxPagesPerQuery: 1 };
    case "tiktok":
      return { profiles: [url], resultsPerPage: 20 };
    case "youtube":
      return { startUrls: [{ url }], maxResults: 20 };
    case "linkedin":
      return { startUrls: [{ url }] };
    case "twitter":
      return { startUrls: [url], maxTweets: 20, addUserInfo: true };
    case "google_maps":
      return { startUrls: [{ url }], maxCrawledPlacesPerSearch: 1 };
    case "website":
    default:
      return { startUrls: [{ url }], maxCrawlPages: 10, crawlerType: "cheerio", maxCrawlDepth: 2 };
  }
}

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

async function simpleScrape(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MeteoraBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || url;
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)?.[1]?.trim() || "";
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i)?.[1]?.trim() || "";
  const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([\s\S]*?)["']/i)?.[1]?.trim() || "";
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim().slice(0, 5000);
  return `FONTE: ${url}\nTÍTULO: ${title}\n${metaDesc ? `DESCRIÇÃO: ${metaDesc}\n` : ""}${ogDesc ? `OG: ${ogDesc}\n` : ""}${ogImage ? `IMAGEM: ${ogImage}\n` : ""}\nCONTEÚDO:\n${text}`;
}

async function runApifyActor(actorId: string, input: any, apiKey: string): Promise<any[]> {
  console.log(`Starting Apify actor: ${actorId}`);
  const runResp = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}&waitForFinish=120`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }
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
  const dataResp = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=50`);
  if (!dataResp.ok) throw new Error(`Dataset fetch failed: ${dataResp.status}`);
  return await dataResp.json();
}

/** Extract preview data (images, thumbnails) from scraped results */
function extractSourcePreviews(platform: string, items: any[], url: string): any {
  const preview: any = { platform, url, thumbnails: [] };
  
  switch (platform) {
    case "instagram": {
      const p = items[0];
      if (p) {
        preview.profilePic = p.profilePicUrl || p.profilePicUrlHD || "";
        preview.displayName = p.fullName || p.username || "";
        preview.bio = p.biography || "";
        preview.followers = p.followersCount || 0;
        preview.posts = p.postsCount || 0;
        // Get thumbnails from recent posts
        const posts = items.filter(i => i.displayUrl || i.thumbnailUrl);
        preview.thumbnails = posts.slice(0, 6).map(post => post.displayUrl || post.thumbnailUrl).filter(Boolean);
      }
      break;
    }
    case "facebook": {
      const page = items[0];
      if (page) {
        preview.profilePic = page.profilePic || page.imageUrl || "";
        preview.displayName = page.title || page.name || "";
        preview.bio = page.description || "";
      }
      break;
    }
    case "youtube": {
      if (items.length > 0) {
        preview.displayName = items[0]?.channelName || "";
        preview.thumbnails = items.slice(0, 6).map(v => v.thumbnailUrl).filter(Boolean);
      }
      break;
    }
    case "linkedin": {
      const co = items[0];
      if (co) {
        preview.profilePic = co.logo || "";
        preview.displayName = co.name || "";
        preview.bio = co.description?.slice(0, 200) || "";
      }
      break;
    }
    case "tiktok": {
      const p = items[0];
      if (p) {
        preview.profilePic = p.authorMeta?.avatar || "";
        preview.displayName = p.authorMeta?.name || p.authorMeta?.nickName || "";
        preview.followers = p.authorMeta?.fans || 0;
        preview.thumbnails = items.slice(0, 6).map(v => v.videoMeta?.coverUrl).filter(Boolean);
      }
      break;
    }
    case "website":
    default: {
      // Try to extract OG images from website pages
      for (const page of items.slice(0, 3)) {
        const ogImg = page.screenshotUrl || page.ogImage || "";
        if (ogImg) preview.thumbnails.push(ogImg);
      }
      preview.displayName = items[0]?.title || url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
      break;
    }
  }
  return preview;
}

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
    case "twitter": {
      return [
        `TWITTER/X: ${url}`,
        ...items.slice(0, 15).map((t: any, i: number) =>
          `${i + 1}. ${(t.full_text || t.text || "").slice(0, 300)} (❤️ ${t.favorite_count || 0}, 🔁 ${t.retweet_count || 0})`
        ),
      ].join("\n");
    }
    case "google_maps": {
      const place = items[0];
      if (!place) return "";
      return [
        `GOOGLE MAPS: ${url}`,
        place.title ? `Nome: ${place.title}` : "",
        place.address ? `Endereço: ${place.address}` : "",
        place.phone ? `Telefone: ${place.phone}` : "",
        place.website ? `Site: ${place.website}` : "",
        place.totalScore ? `Avaliação: ${place.totalScore}` : "",
        place.reviewsCount ? `Reviews: ${place.reviewsCount}` : "",
        place.openingHours ? `Horários: ${JSON.stringify(place.openingHours)}` : "",
        place.categoryName ? `Categoria: ${place.categoryName}` : "",
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

async function buildStructuredOverview(allContent: string, pastedText: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  const combinedInput = [
    allContent ? `DADOS DAS REDES SOCIAIS E SITE:\n${allContent}` : "",
    pastedText ? `TEXTO COLADO PELO CLIENTE:\n${pastedText}` : "",
  ].filter(Boolean).join("\n\n---\n\n");

  if (!combinedInput) return null;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em análise de negócios. Analise TODOS os dados fornecidos (redes sociais, site, textos colados) e retorne um JSON estruturado com o overview completo do negócio.

RETORNE APENAS o JSON, sem markdown, sem backticks, sem explicação. O JSON deve ter esta estrutura:
{
  "businessName": "Nome real da empresa/negócio (NÃO o nome do dono)",
  "sector": "Setor/ramo de atividade",
  "address": "Endereço completo se encontrado",
  "hours": "Horários de funcionamento se encontrados",
  "products": "Lista de produtos/serviços oferecidos",
  "prices": "Tabela de preços se encontrada",
  "highlights": "Diferenciais, pontos fortes, informações importantes",
  "description": "Descrição concisa do negócio em 2-3 frases",
  "contactInfo": "Telefone, email, WhatsApp se encontrados",
  "tone": "Tom de comunicação percebido (formal, descontraído, etc.)"
}

REGRAS:
- Use APENAS informações reais encontradas nos dados
- NÃO invente dados que não existem - deixe o campo vazio string "" se não encontrou
- O businessName deve ser o nome da EMPRESA, não da pessoa física
- Seja detalhista nos campos que encontrar informação
- Capture TUDO que um atendente virtual precisaria saber`,
          },
          { role: "user", content: combinedInput.slice(0, 15000) },
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonStr = content.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("AI overview error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { urls, tenantId, attendantId, pastedText } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0 || !tenantId) {
      return new Response(JSON.stringify({ error: "urls array and tenantId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const results: { url: string; platform: string; status: string; chunks?: number; title?: string; details?: string }[] = [];
    const allRawContents: string[] = [];
    const sourcePreviews: any[] = [];

    for (const url of urls) {
      const platform = detectPlatform(url);
      try {
        let rawContent = "";
        let apifyItems: any[] | null = null;

        if (APIFY_API_KEY) {
          const actorId = APIFY_ACTORS[platform] || APIFY_ACTORS.website;
          const input = buildApifyInput(platform, url);
          console.log(`[${platform}] Running Apify actor ${actorId} for ${url}`);
          try {
            apifyItems = await runApifyActor(actorId, input, APIFY_API_KEY);
            rawContent = formatApifyResults(platform, apifyItems, url);
            console.log(`[${platform}] Apify returned ${apifyItems.length} items, ${rawContent.length} chars`);
          } catch (apifyErr) {
            console.warn(`[${platform}] Apify failed, falling back to simple scrape:`, apifyErr);
            rawContent = await simpleScrape(url);
          }
        } else {
          rawContent = await simpleScrape(url);
        }

        // Extract preview data for frontend display
        if (apifyItems && apifyItems.length > 0) {
          sourcePreviews.push(extractSourcePreviews(platform, apifyItems, url));
        } else {
          sourcePreviews.push({ platform, url, displayName: url.replace(/https?:\/\/(www\.)?/, "").split("/")[0], thumbnails: [] });
        }

        if (!rawContent || rawContent.length < 20) {
          results.push({ url, platform, status: "empty", details: "Nenhum conteúdo extraído" });
          continue;
        }

        allRawContents.push(`[${platform.toUpperCase()}] ${rawContent}`);

        const chunks = chunkContent(rawContent);
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
          results.push({ url, platform, status: "success", chunks: chunks.length, details: `${rawContent.length} chars processados` });
        }
      } catch (e) {
        console.error(`[${platform}] Failed for ${url}:`, e);
        results.push({ url, platform, status: "error", details: e instanceof Error ? e.message : "Unknown" });
        sourcePreviews.push({ platform, url, displayName: url.replace(/https?:\/\/(www\.)?/, "").split("/")[0], thumbnails: [] });
      }
    }

    const allContent = allRawContents.join("\n\n===\n\n");
    console.log(`Building structured overview from ${allContent.length} chars total content...`);
    const overview = await buildStructuredOverview(allContent, pastedText || "");

    // Store pasted text
    if (pastedText && pastedText.trim().length > 10) {
      const chunks = chunkContent(pastedText);
      const rows = chunks.map((chunk, i) => ({
        tenant_id: tenantId,
        attendant_id: attendantId || null,
        source_type: "manual",
        source_url: null,
        source_name: "Texto colado pelo cliente",
        content: chunk,
        chunk_index: i,
        metadata: { total_chunks: chunks.length, scraped_at: new Date().toISOString() },
      }));
      await supabase.from("knowledge_base").insert(rows).catch(e => console.error("Pasted text insert error:", e));
    }

    return new Response(JSON.stringify({ success: true, results, overview, sourcePreviews }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-urls error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
