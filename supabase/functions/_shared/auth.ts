import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Verify that the request has a valid Supabase JWT.
 * Returns the user object if valid, null if not.
 *
 * Works with the standard Authorization header sent by the Supabase JS client.
 * The frontend sends the anon key by default; authenticated requests include
 * the user's JWT instead.
 */
export async function verifyUser(
  req: Request,
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;

  // Use Supabase client to verify the token
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return { id: user.id, email: user.email };
}

/**
 * Verify that the request has the service role key (for internal/edge-to-edge calls).
 */
export function verifyServiceRole(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Check if the Authorization header carries the anon key instead of a user JWT.
 * This is a transitional check — the frontend currently sends the anon key for
 * several edge functions. Once migrated to user JWTs this can be removed.
 */
export function isAnonKeyRequest(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  return !!anonKey && token === anonKey;
}

/**
 * Require authentication — tries user JWT first, falls back to accepting the
 * anon key with a warning (for backwards compatibility during migration).
 *
 * Returns the user if authenticated via JWT, or a sentinel { id: "anon" } when
 * the anon key is used. Returns null if no valid auth is present at all.
 *
 * Also accepts service role key (for internal edge-to-edge calls).
 */
export async function requireAuth(
  req: Request,
  functionName: string,
): Promise<{ id: string; email?: string } | null> {
  // Service role always passes
  if (verifyServiceRole(req)) {
    return { id: "service-role" };
  }

  // Try real user JWT
  const user = await verifyUser(req);
  if (user) return user;

  // Fallback: accept anon key with warning (transitional)
  if (isAnonKeyRequest(req)) {
    console.warn(
      `[${functionName}] Called with anon key instead of user JWT. ` +
        "TODO: migrate frontend to send user access_token.",
    );
    return { id: "anon" };
  }

  return null;
}
