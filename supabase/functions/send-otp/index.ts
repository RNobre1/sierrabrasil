import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHdrs = getCorsHeaders(req);
  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHdrs, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") return handleCors(req);
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const OTP_INSTANCE = Deno.env.get("EVOLUTION_OTP_INSTANCE");

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !OTP_INSTANCE) {
    return json({ error: "OTP service not configured" }, 500);
  }

  // Auth — verify user JWT
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return json({ error: "Nao autorizado" }, 401);
  const token = authHeader.replace("Bearer ", "");

  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) {
    console.error("Auth error in send-otp:", authError?.message, "header present:", !!authHeader);
    return json({ error: "Nao autorizado" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { phone } = await req.json();
    if (!phone) return json({ error: "phone e obrigatorio" }, 400);

    // Normalize phone: ensure +55 prefix and only digits after
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 12) return json({ error: "Numero invalido" }, 400);

    // Rate limit: max 3 OTP sends per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("phone_verifications")
      .select("id", { count: "exact", head: true })
      .eq("phone", cleanPhone)
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 3) {
      console.warn(`Rate limit hit for phone ${cleanPhone} (user ${user.id})`);
      return json({
        error: "Muitas tentativas. Aguarde 1 hora antes de solicitar novo código.",
      }, 429);
    }

    // Invalidate previous pending verifications for this user
    await supabase
      .from("phone_verifications")
      .update({ expires_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("verified_at", null);

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Insert verification record (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from("phone_verifications")
      .insert({
        user_id: user.id,
        phone: cleanPhone,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return json({ error: "Erro ao gerar codigo" }, 500);
    }

    // Send OTP via Evolution API
    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
    const sendRes = await fetch(`${baseUrl}/message/sendText/${OTP_INSTANCE}`, {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: `*${code}* e seu codigo de verificacao Meteora Digital. Valido por 5 minutos. Nao compartilhe com ninguem.`,
      }),
    });

    if (!sendRes.ok) {
      const errData = await sendRes.text();
      console.error("Evolution sendText error:", errData);
      return json({ error: "Erro ao enviar codigo via WhatsApp" }, 502);
    }

    console.log(`OTP sent to ${cleanPhone} for user ${user.id}`);
    return json({ success: true, phone: cleanPhone });
  } catch (e) {
    console.error("send-otp error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
