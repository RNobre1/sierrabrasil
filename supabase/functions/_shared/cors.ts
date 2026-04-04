/**
 * Shared CORS utility for all Edge Functions.
 *
 * When the env var ALLOWED_ORIGINS is set (comma-separated list of origins,
 * e.g. "https://app.example.com,https://admin.example.com"), only those
 * origins will receive the Access-Control-Allow-Origin header.
 *
 * When ALLOWED_ORIGINS is NOT set (local dev), falls back to "*".
 */

const ALLOWED_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
].join(", ");

/**
 * Build CORS headers for the given request.
 *
 * - If ALLOWED_ORIGINS is set, validates the request's Origin header against
 *   the whitelist and reflects the specific origin (or omits the header).
 * - If ALLOWED_ORIGINS is NOT set, returns `*` (dev mode).
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const allowedRaw = Deno.env.get("ALLOWED_ORIGINS");

  if (!allowedRaw) {
    // Dev mode — allow everything
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    };
  }

  const allowedOrigins = allowedRaw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const requestOrigin = req.headers.get("origin") ?? "";

  if (allowedOrigins.includes(requestOrigin)) {
    return {
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Vary": "Origin",
    };
  }

  // Origin not in whitelist — omit Access-Control-Allow-Origin to block
  return {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 * Returns a 204 No Content with the appropriate CORS headers.
 */
export function handleCors(req: Request): Response {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}
