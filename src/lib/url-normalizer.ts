/**
 * Normalizes social media input (username, @handle, partial URL, full URL)
 * into a canonical full URL ready for scraping.
 */
export function normalizeSocialUrl(platform: string, raw: string): string {
  const input = raw.trim();
  if (!input) return "";

  switch (platform) {
    case "instagram":
      return normalizeInstagram(input);
    case "facebook":
      return normalizeFacebook(input);
    case "linkedin":
      return normalizeLinkedin(input);
    case "tiktok":
      return normalizeTiktok(input);
    case "youtube":
      return normalizeYoutube(input);
    case "website":
      return normalizeWebsite(input);
    default:
      return normalizeWebsite(input);
  }
}

/**
 * Extracts the platform-specific slug/username from a URL or raw input.
 * Useful for display purposes.
 */
export function extractPlatformSlug(platform: string, raw: string): string {
  const input = raw.trim();
  if (!input) return "";

  // If it doesn't look like a URL, return as-is
  if (!input.includes("/") && !input.includes(".")) return input;

  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    const path = url.pathname.replace(/\/+$/, "");
    const segments = path.split("/").filter(Boolean);

    switch (platform) {
      case "instagram":
        return segments[0] || input;
      case "facebook":
        return segments[0] || input;
      case "linkedin":
        // /company/slug or /in/slug
        return segments.length >= 2 ? segments[1] : segments[0] || input;
      case "tiktok":
        return segments[0] || input; // includes @
      case "youtube":
        return segments[0] || input; // includes @
      default:
        return input;
    }
  } catch {
    return input;
  }
}

// --- Platform-specific normalizers ---

function stripProtocolAndWww(input: string): string {
  return input.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

function isUrl(input: string): boolean {
  return input.includes(".") && (input.includes("/") || input.includes(".com") || input.includes(".com.br"));
}

function normalizeInstagram(input: string): string {
  // Full or partial URL
  if (isUrl(input)) {
    const clean = stripProtocolAndWww(input.startsWith("http") ? input : `https://${input}`);
    // Extract path: instagram.com/username/...
    const match = clean.match(/instagram\.com\/([^/?#]+)/);
    if (match) {
      return `https://www.instagram.com/${match[1]}/`;
    }
  }

  // @username or plain username
  const username = input.replace(/^@+/, "");
  return `https://www.instagram.com/${username}/`;
}

function normalizeFacebook(input: string): string {
  // Full or partial URL
  if (isUrl(input)) {
    const withProto = input.startsWith("http") ? input : `https://${input}`;
    // Replace fb.com with facebook.com
    const normalized = withProto.replace(/\/\/fb\.com/, "//www.facebook.com");

    try {
      const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);

      // Preserve profile.php URLs with query params
      if (url.pathname.includes("profile.php")) {
        return `https://www.facebook.com/profile.php?id=${url.searchParams.get("id")}`;
      }

      const path = url.pathname.replace(/\/+$/, "");
      const segments = path.split("/").filter(Boolean);
      if (segments[0]) {
        return `https://www.facebook.com/${segments[0]}/`;
      }
    } catch {
      // fallback
    }

    // fallback: strip protocol/www, extract slug
    const clean = stripProtocolAndWww(normalized);
    const match = clean.match(/facebook\.com\/([^/?#]+)/);
    if (match) {
      return `https://www.facebook.com/${match[1]}/`;
    }
  }

  // @pagename or plain pagename
  const pageName = input.replace(/^@+/, "");
  return `https://www.facebook.com/${pageName}/`;
}

function normalizeLinkedin(input: string): string {
  // Full or partial URL containing linkedin.com
  if (input.includes("linkedin.com")) {
    const withProto = input.startsWith("http") ? input : `https://${input}`;

    try {
      const url = new URL(withProto);
      const path = url.pathname.replace(/\/+$/, "");
      const segments = path.split("/").filter(Boolean);

      // /in/person-slug
      if (segments[0] === "in" && segments[1]) {
        return `https://www.linkedin.com/in/${segments[1]}/`;
      }

      // /company/company-slug
      if (segments[0] === "company" && segments[1]) {
        return `https://www.linkedin.com/company/${segments[1]}/`;
      }

      // Unknown path pattern — keep first two segments
      if (segments.length >= 2) {
        return `https://www.linkedin.com/${segments[0]}/${segments[1]}/`;
      }
    } catch {
      // fallback regex
      const match = input.match(/linkedin\.com\/(company|in)\/([^/?#]+)/);
      if (match) {
        return `https://www.linkedin.com/${match[1]}/${match[2]}/`;
      }
    }
  }

  // Plain slug — assume company
  const slug = input.replace(/^@+/, "").replace(/\s+/g, "-");
  return `https://www.linkedin.com/company/${slug}/`;
}

function normalizeTiktok(input: string): string {
  // Full or partial URL
  if (isUrl(input)) {
    const withProto = input.startsWith("http") ? input : `https://${input}`;
    const clean = stripProtocolAndWww(withProto);
    const match = clean.match(/tiktok\.com\/(@[^/?#]+)/);
    if (match) {
      return `https://www.tiktok.com/${match[1]}`;
    }
    // URL without @ (tiktok.com/username)
    const match2 = clean.match(/tiktok\.com\/([^/?#]+)/);
    if (match2) {
      const user = match2[1].startsWith("@") ? match2[1] : `@${match2[1]}`;
      return `https://www.tiktok.com/${user}`;
    }
  }

  // @username or plain username
  const username = input.replace(/^@+/, "");
  return `https://www.tiktok.com/@${username}`;
}

function normalizeYoutube(input: string): string {
  // youtu.be links — pass through
  if (input.includes("youtu.be")) {
    return input.startsWith("http") ? input : `https://${input}`;
  }

  // Full or partial URL
  if (isUrl(input)) {
    const withProto = input.startsWith("http") ? input : `https://${input}`;

    try {
      const url = new URL(withProto);
      const path = url.pathname.replace(/\/+$/, "");
      const segments = path.split("/").filter(Boolean);

      // /channel/UCXXX — preserve
      if (segments[0] === "channel" && segments[1]) {
        return `https://www.youtube.com/channel/${segments[1]}`;
      }

      // /c/ChannelName — preserve
      if (segments[0] === "c" && segments[1]) {
        return `https://www.youtube.com/c/${segments[1]}`;
      }

      // /@Handle
      if (segments[0]?.startsWith("@")) {
        return `https://www.youtube.com/${segments[0]}`;
      }

      // /HandleName (no @ prefix in URL but it's a handle)
      if (segments[0]) {
        return `https://www.youtube.com/@${segments[0]}`;
      }
    } catch {
      // fallback
    }
  }

  // @channel or plain channel name
  const handle = input.startsWith("@") ? input : `@${input}`;
  return `https://www.youtube.com/${handle}`;
}

function normalizeWebsite(input: string): string {
  if (input.startsWith("https://")) return input;
  if (input.startsWith("http://")) return input.replace("http://", "https://");
  return `https://${input}`;
}
