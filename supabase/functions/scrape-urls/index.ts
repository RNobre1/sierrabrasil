import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

// Apify actors — using the fastest/cheapest tiers available
const APIFY_ACTORS: Record<string, string> = {
  instagram: "apify~instagram-scraper",
  facebook: "apify~facebook-pages-scraper",
  tiktok: "clockworks~free-tiktok-scraper",
  youtube: "streamers~youtube-channel-scraper",
  linkedin: "anchor~linkedin-company-scraper",
  twitter: "apidojo~tweet-scraper",
  website: "apify~website-content-crawler",
  google_maps: "compass~crawler-google-places",
};

function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return "instagram";
  if (lower.includes("facebook.com") || lower.includes("fb.com")) return "facebook";
  if (lower.includes("tiktok.com")) return "tiktok";
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("linkedin.com")) return "linkedin";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
  if (lower.includes("google.com/maps") || lower.includes("goo.gl/maps")) return "google_maps";
  return "website";
}

/** Normalize URL — strip trailing sub-pages, ensure consistent format */
function normalizeUrlForPlatform(platform: string, url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

    switch (platform) {
      case "linkedin": {
        // /company/slug/about → /company/slug/
        // /in/slug/detail → /in/slug/
        if ((segments[0] === "company" || segments[0] === "in") && segments[1]) {
          return `https://www.linkedin.com/${segments[0]}/${segments[1]}/`;
        }
        return url;
      }
      case "facebook": {
        if (parsed.pathname.includes("profile.php")) return url;
        if (segments[0]) {
          return `https://www.facebook.com/${segments[0]}/`;
        }
        return url;
      }
      case "instagram": {
        if (segments[0]) {
          return `https://www.instagram.com/${segments[0]}/`;
        }
        return url;
      }
      default:
        return url;
    }
  } catch {
    return url;
  }
}

/** Detect if a LinkedIn URL is a personal profile (/in/) vs company (/company/) */
function isLinkedInPersonalProfile(url: string): boolean {
  return /linkedin\.com\/in\//i.test(url);
}

function buildApifyInput(platform: string, url: string): { actorOverride?: string; input: any } {
  switch (platform) {
    case "instagram": {
      return {
        input: {
          directUrls: [url],
          resultsType: "posts",
          resultsLimit: 12,
        },
      };
    }
    case "facebook":
      return { input: { startUrls: [{ url }], maxPagesPerQuery: 1 } };
    case "tiktok":
      return { input: { profiles: [url], resultsPerPage: 20 } };
    case "youtube":
      return { input: { startUrls: [{ url }], maxResults: 20 } };
    case "linkedin": {
      if (isLinkedInPersonalProfile(url)) {
        // Personal profiles need the profile scraper, not the company scraper
        return {
          actorOverride: "anchor~linkedin-profile-scraper",
          input: { startUrls: [{ url }] },
        };
      }
      return { input: { startUrls: [{ url }] } };
    }
    case "twitter":
      return { input: { startUrls: [url], maxTweets: 20, addUserInfo: true } };
    case "google_maps":
      return { input: { startUrls: [{ url }], maxCrawledPlacesPerSearch: 1 } };
    case "website":
    default:
      return { input: { startUrls: [{ url }], maxCrawlPages: 10, crawlerType: "cheerio", maxCrawlDepth: 2 } };
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

/** Detect if scraped HTML is a login/auth wall instead of real content */
function isLoginPage(html: string): boolean {
  const lower = html.toLowerCase();
  const loginIndicators = [
    "login_form", "signup-form", "signin-form",
    "authwall", "auth_wall", "auth-wall",
    "login-form", "log_in", "sign_in",
    'action="/login"', 'action="/signin"',
    "challenge/recaptcha",
    "captcha-container",
    // LinkedIn specific
    "linkedin.com/login", "linkedin.com/checkpoint",
    "join now", "sign in to linkedin", "sign in to continue",
    // Facebook specific
    "facebook.com/login", "login_form_container",
    "You must log in to continue", "log in to facebook",
    "Você precisa fazer login",
  ];
  const matchCount = loginIndicators.filter(ind => lower.includes(ind.toLowerCase())).length;
  return matchCount >= 2;
}

async function simpleScrape(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const html = await resp.text();

  // Detect login walls — don't store garbage
  if (isLoginPage(html)) {
    throw new Error(`Login wall detected — ${url} requires authentication and cannot be scraped directly`);
  }

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
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiKey}&waitForFinish=60`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(70000) }
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
  const dataResp = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}&limit=50`, { signal: AbortSignal.timeout(15000) });
  if (!dataResp.ok) throw new Error(`Dataset fetch failed: ${dataResp.status}`);
  return await dataResp.json();
}

/** Download an image and return as base64 data URI, or empty string on failure */
async function toDataUri(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";
  try {
    const resp = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MeteoraBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return "";
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buf = await resp.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return `data:${contentType};base64,${base64}`;
  } catch {
    return "";
  }
}

/** Extract preview data (images, thumbnails) from scraped results */
async function extractSourcePreviews(platform: string, items: any[], url: string): Promise<any> {
  const preview: any = { platform, url, thumbnails: [] };
  
  switch (platform) {
    case "instagram": {
      const first = items[0];
      if (first) {
        // apify/instagram-scraper returns posts with owner info
        const ownerPic = first.ownerProfilePicUrl || first.profilePicUrl || first.profilePicUrlHD || "";
        preview.profilePic = ownerPic ? await toDataUri(ownerPic) : "";
        preview.displayName = first.ownerFullName || first.ownerUsername || first.fullName || first.username || "";
        preview.bio = first.biography || first.caption?.slice(0, 200) || "";
        preview.followers = first.followersCount || first.ownerFollowerCount || 0;
        // Get thumbnails from posts — convert to base64 to avoid CORS blocking
        const thumbUrls = items
          .map(post => post.displayUrl || post.thumbnailSrc || post.previewUrl || post.url)
          .filter(Boolean)
          .slice(0, 6);
        const thumbPromises = thumbUrls.map(url => toDataUri(url));
        preview.thumbnails = (await Promise.all(thumbPromises)).filter(Boolean);
      }
      break;
    }
    case "facebook": {
      const page = items[0];
      if (page) {
        const fbPic = page.profilePic || page.imageUrl || "";
        preview.profilePic = fbPic ? await toDataUri(fbPic) : "";
        preview.displayName = page.title || page.name || "";
        preview.bio = page.description || "";
        preview.followers = page.likes || page.followersCount || 0;
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
        preview.profilePic = await toDataUri(co.logo || co.logoUrl || co.imageUrl || "");
        preview.displayName = co.name || "";
        preview.bio = co.description?.slice(0, 200) || "";
        preview.followers = co.followersCount || co.staffCount || 0;
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
      // Try to get OG image as profile pic (hero screenshot of the site)
      const firstPage = items[0];
      const heroImg = firstPage?.screenshotUrl || firstPage?.ogImage || firstPage?.metadata?.ogImage || "";
      if (heroImg) {
        preview.profilePic = await toDataUri(heroImg);
      }
      // Additional thumbnails from other pages
      for (const page of items.slice(0, 3)) {
        const ogImg = page.screenshotUrl || page.ogImage || page.metadata?.ogImage || "";
        if (ogImg) preview.thumbnails.push(ogImg);
      }
      preview.displayName = firstPage?.title || firstPage?.metadata?.title || url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
      preview.bio = firstPage?.metadata?.description || firstPage?.description || "";
      break;
    }
  }
  return preview;
}

function formatApifyResults(platform: string, items: any[], url: string): string {
  if (!items || items.length === 0) return "";
  switch (platform) {
    case "instagram": {
      const first = items[0];
      const parts = [
        `INSTAGRAM: ${url}`,
        first?.ownerFullName ? `Nome: ${first.ownerFullName}` : "",
        first?.ownerUsername ? `Username: @${first.ownerUsername}` : "",
      ].filter(Boolean);
      const posts = items.filter(i => i.caption);
      if (posts.length > 0) {
        parts.push("\nPOSTS RECENTES:");
        posts.slice(0, 12).forEach((p, i) => {
          parts.push(`${i + 1}. ${(p.caption || "").slice(0, 300)}${p.likesCount ? ` (${p.likesCount} likes)` : ""}${p.commentsCount ? ` (${p.commentsCount} comments)` : ""}`);
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
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_API_KEY) return null;

  const combinedInput = [
    allContent ? `DADOS DAS REDES SOCIAIS E SITE:\n${allContent}` : "",
    pastedText ? `TEXTO COLADO PELO CLIENTE:\n${pastedText}` : "",
  ].filter(Boolean).join("\n\n---\n\n");

  if (!combinedInput) return null;

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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
- Capture TUDO que um agente virtual precisaria saber`,
          },
          { role: "user", content: combinedInput.slice(0, 15000) },
        ],
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonStr = content.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    // Ensure all values are strings (AI sometimes returns objects/arrays)
    for (const key of Object.keys(parsed)) {
      if (parsed[key] !== null && typeof parsed[key] === "object") {
        parsed[key] = Array.isArray(parsed[key])
          ? parsed[key].join(", ")
          : Object.entries(parsed[key]).map(([k, v]) => `${k}: ${v}`).join("\n");
      }
    }
    return parsed;
  } catch (e) {
    console.error("AI overview error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    // Auth: verify user JWT
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const _supaAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user: _caller }, error: _authErr } = await _supaAuth.auth.getUser(token);
    if (_authErr || !_caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { urls, tenantId, attendantId, pastedText } = await req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0 || !tenantId) {
      return new Response(JSON.stringify({ error: "urls array and tenantId required" }), {
        status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const results: { url: string; platform: string; status: string; chunks?: number; title?: string; details?: string }[] = [];
    const allRawContents: string[] = [];
    const sourcePreviews: any[] = [];

    // Process all URLs in parallel with individual timeouts
    const urlPromises = urls.map(async (rawUrl: string) => {
      const platform = detectPlatform(rawUrl);
      const url = normalizeUrlForPlatform(platform, rawUrl);
      try {
        let rawContent = "";
        let apifyItems: any[] | null = null;

        if (APIFY_API_KEY) {
          const defaultActorId = APIFY_ACTORS[platform] || APIFY_ACTORS.website;
          const { actorOverride, input } = buildApifyInput(platform, url);
          const actorId = actorOverride || defaultActorId;
          console.log(`[${platform}] Running Apify actor ${actorId} for ${url}`);
          try {
            apifyItems = await runApifyActor(actorId, input, APIFY_API_KEY);
            rawContent = formatApifyResults(platform, apifyItems, url);
            console.log(`[${platform}] Apify returned ${apifyItems.length} items, ${rawContent.length} chars`);
          } catch (apifyErr) {
            console.warn(`[${platform}] Apify failed, falling back to simple scrape:`, apifyErr);
            try {
              rawContent = await simpleScrape(url);
            } catch (scrapeErr) {
              console.warn(`[${platform}] Simple scrape also failed:`, scrapeErr);
              rawContent = "";
            }
          }
        } else {
          try {
            rawContent = await simpleScrape(url);
          } catch (scrapeErr) {
            console.warn(`[${platform}] Simple scrape failed:`, scrapeErr);
            rawContent = "";
          }
        }

        // Extract preview data for frontend display
        let preview: any;
        if (apifyItems && apifyItems.length > 0) {
          preview = await extractSourcePreviews(platform, apifyItems, url);
        } else {
          // Fallback: try to extract OG image from raw scraped content
          const ogMatch = rawContent.match(/IMAGEM:\s*(\S+)/);
          const titleMatch = rawContent.match(/TÍTULO:\s*(.+)/);
          const descMatch = rawContent.match(/DESCRIÇÃO:\s*(.+)/);
          const ogUrl = ogMatch?.[1] || "";
          preview = {
            platform,
            url,
            displayName: titleMatch?.[1]?.trim() || url.replace(/https?:\/\/(www\.)?/, "").split("/")[0],
            bio: descMatch?.[1]?.trim().slice(0, 200) || "",
            profilePic: ogUrl ? await toDataUri(ogUrl) : "",
            thumbnails: [],
          };
        }

        if (!rawContent || rawContent.length < 20) {
          return { result: { url, platform, status: "empty", details: "Nenhum conteúdo extraído" } as any, rawContent: "", preview };
        }

        // Filter low-value social media content (mostly emojis/hashtags or very short)
        if (platform !== "website" && platform !== "google_maps") {
          const textOnly = rawContent.replace(/[#@]\S+/g, '').replace(/[\u{1F000}-\u{1FFFF}]/gu, '').trim();
          const usefulTextRatio = textOnly.length / Math.max(rawContent.length, 1);

          if (rawContent.length < 100 || usefulTextRatio < 0.3) {
            console.log(`[${platform}] Skipping low-value content (${rawContent.length} chars, ${Math.round(usefulTextRatio * 100)}% useful text)`);
            return { result: { url, platform, status: "filtered", details: "Conteúdo de baixo valor filtrado" } as any, rawContent: "", preview };
          }
        }

        const chunks = chunkContent(rawContent);
        const sourcePriority = platform === "website" ? 70 : 10;
        const rows = chunks.map((chunk, i) => ({
          tenant_id: tenantId,
          attendant_id: attendantId || null,
          source_type: platform === "website" ? "website" : "social",
          source_url: url,
          source_name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} - ${url.replace(/https?:\/\/(www\.)?/, "").slice(0, 50)}`,
          content: chunk,
          chunk_index: i,
          source_priority: sourcePriority,
          metadata: { total_chunks: chunks.length, platform, scraped_at: new Date().toISOString(), raw_length: rawContent.length },
        }));

        const { error } = await supabase.from("knowledge_base").insert(rows);
        if (error) {
          console.error(`[${platform}] DB insert error:`, error);
          return { result: { url, platform, status: "error", details: error.message } as any, rawContent, preview };
        }
        return { result: { url, platform, status: "success", chunks: chunks.length, details: `${rawContent.length} chars processados` } as any, rawContent: `[${platform.toUpperCase()}] ${rawContent}`, preview };
      } catch (e) {
        console.error(`[${platform}] Failed for ${url}:`, e);
        return {
          result: { url, platform, status: "error", details: e instanceof Error ? e.message : "Unknown" } as any,
          rawContent: "",
          preview: { platform, url, displayName: url.replace(/https?:\/\/(www\.)?/, "").split("/")[0], thumbnails: [] },
        };
      }
    });

    const settled = await Promise.all(urlPromises);
    for (const s of settled) {
      results.push(s.result);
      if (s.rawContent) allRawContents.push(s.rawContent);
      sourcePreviews.push(s.preview);
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
        source_priority: 90,
        metadata: { total_chunks: chunks.length, scraped_at: new Date().toISOString() },
      }));
      await supabase.from("knowledge_base").insert(rows).catch(e => console.error("Pasted text insert error:", e));
    }

    return new Response(JSON.stringify({ success: true, results, overview, sourcePreviews }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scrape-urls error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
