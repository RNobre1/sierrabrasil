import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Auth — create client with the caller's Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "Nao autorizado" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    console.error("Auth error in verify-otp:", authError?.message);
    return json({ error: "Nao autorizado" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { code } = await req.json();
    if (!code || code.length !== 6) return json({ error: "Codigo invalido" }, 400);

    // Find latest pending verification for this user
    const { data: verification, error: fetchError } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("user_id", user.id)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verification) {
      return json({ error: "Codigo expirado ou inexistente. Solicite um novo." });
    }

    // Check max attempts
    if (verification.attempts >= verification.max_attempts) {
      return json({ error: "Tentativas esgotadas. Solicite um novo codigo." });
    }

    // Increment attempts
    await supabase
      .from("phone_verifications")
      .update({ attempts: verification.attempts + 1 })
      .eq("id", verification.id);

    // Validate code
    if (verification.code !== code) {
      const remaining = verification.max_attempts - verification.attempts - 1;
      return json({
        error: `Codigo incorreto. ${remaining} tentativa${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""}.`,
        remaining,
      });
    }

    // Mark as verified
    await supabase
      .from("phone_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", verification.id);

    // Update profile: set phone and phone_verified
    await supabase
      .from("profiles")
      .update({
        phone: verification.phone,
        phone_verified: true,
      })
      .eq("user_id", user.id);

    console.log(`Phone verified for user ${user.id}: ${verification.phone}`);
    return json({ success: true, phone: verification.phone });
  } catch (e) {
    console.error("verify-otp error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
