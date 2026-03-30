import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!EVOLUTION_API_URL) return json({ error: "EVOLUTION_API_URL not configured" }, 500);
  if (!EVOLUTION_API_KEY) return json({ error: "EVOLUTION_API_KEY not configured" }, 500);

  // Auth: get user from JWT
  const authHeader = req.headers.get("authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Não autorizado" }, 401);

  // Get tenant for this user
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!tenant) return json({ error: "Tenant não encontrado" }, 404);

  const body = req.method === "POST" ? await req.json() : {};
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const evoHeaders = {
    apikey: EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  };

  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");

  // Helper: fetch profile picture from Evolution API
  async function fetchAndSaveProfilePic(instanceName: string, instId: string) {
    try {
      const picRes = await fetch(`${baseUrl}/chat/fetchProfilePictureUrl/${instanceName}`, {
        method: "POST",
        headers: evoHeaders,
        body: JSON.stringify({ number: instanceName }),
      });
      if (picRes.ok) {
        const picData = await picRes.json();
        const picUrl = picData?.profilePictureUrl || picData?.profilePicUrl || picData?.picture || null;
        if (picUrl) {
          await supabase.from("whatsapp_instances").update({ profile_pic_url: picUrl }).eq("id", instId);
          console.log("Profile pic saved for", instanceName);
        }
      }
    } catch (e) {
      console.warn("fetchProfilePic error (non-fatal):", e);
    }
  }

  try {
    switch (action) {
      // ─── Create Instance ───────────────────────────────────
      case "create_instance": {
        const { instanceName, displayName } = body;
        if (!instanceName) return json({ error: "instanceName é obrigatório" }, 400);

        // Sanitize: prefix with tenant slug for isolation
        const safeName = `${tenant.id.substring(0, 8)}_${instanceName.replace(/[^a-zA-Z0-9_-]/g, "")}`;

        const evoRes = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers: evoHeaders,
          body: JSON.stringify({
            instanceName: safeName,
            integration: "WHATSAPP-BAILEYS",
          }),
        });
        const evoData = await evoRes.json();

        if (!evoRes.ok) {
          console.error("Evolution create error:", evoData);
          return json({ error: "Erro ao criar instância", details: evoData }, evoRes.status);
        }

        // Save to DB
        const { data: instance, error: dbError } = await supabase
          .from("whatsapp_instances")
          .insert({
            tenant_id: tenant.id,
            instance_name: safeName,
            display_name: displayName || instanceName,
            status: "created",
            metadata: evoData,
          })
          .select()
          .single();

        if (dbError) {
          console.error("DB insert error:", dbError);
          return json({ error: "Instância criada na API mas falhou ao salvar no banco", details: dbError.message }, 500);
        }

        return json({ success: true, instance });
      }

      // ─── Connect (get QR Code) ────────────────────────────
      case "connect": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName é obrigatório" }, 400);

        // Verify ownership
        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("instance_name", instanceName)
          .single();
        if (!inst) return json({ error: "Instância não encontrada" }, 404);

        const evoRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: "GET",
          headers: evoHeaders,
        });

        const evoText = await evoRes.text();
        console.log("Evolution connect raw response:", evoText);

        let evoData: Record<string, unknown>;
        try {
          evoData = JSON.parse(evoText);
        } catch {
          console.error("Failed to parse Evolution response as JSON");
          return json({ error: "Resposta inválida da Evolution API", raw: evoText }, 502);
        }

        if (!evoRes.ok) {
          console.error("Evolution connect error:", evoData);
          return json({ error: "Erro ao conectar instância", details: evoData }, evoRes.status);
        }

        // Extract QR code - support multiple response formats
        const qrCode = (evoData?.base64 as string) ||
                        ((evoData?.qrcode as Record<string, unknown>)?.base64 as string) ||
                        (evoData?.code as string) ||
                        ((evoData?.qr as Record<string, unknown>)?.base64 as string) ||
                        null;

        console.log("QR code extracted:", qrCode ? `found (${qrCode.substring(0, 50)}...)` : "null");
        console.log("Response keys:", Object.keys(evoData));

        if (qrCode) {
          await supabase
            .from("whatsapp_instances")
            .update({ qr_code: qrCode, status: "connecting" })
            .eq("id", inst.id);
        } else {
          // Check if already connected
          const state = (evoData?.instance as Record<string, unknown>)?.state as string;
          if (state === "open") {
            await supabase
              .from("whatsapp_instances")
              .update({ status: "connected", connected_at: new Date().toISOString(), qr_code: null })
              .eq("id", inst.id);
            // Fetch profile pic on connection
            await fetchAndSaveProfilePic(instanceName, inst.id);
            return json({ success: true, alreadyConnected: true });
          }
          console.warn("No QR code found in response and instance not connected");
        }

        return json({ success: true, qrCode, raw: evoData });
      }

      // ─── Fetch Status ─────────────────────────────────────
      case "status": {
        const instanceName = url.searchParams.get("instanceName");
        if (!instanceName) return json({ error: "instanceName é obrigatório" }, 400);

        // Verify ownership
        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("instance_name", instanceName)
          .single();
        if (!inst) return json({ error: "Instância não encontrada" }, 404);

        const evoRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
          method: "GET",
          headers: evoHeaders,
        });
        const evoData = await evoRes.json();

        // Sync status to DB
        const newStatus = evoData?.instance?.state === "open" ? "connected" :
                          evoData?.instance?.state === "close" ? "disconnected" : "connecting";
        
        await supabase
          .from("whatsapp_instances")
          .update({
            status: newStatus,
            ...(newStatus === "connected" ? { connected_at: new Date().toISOString(), qr_code: null } : {}),
          })
          .eq("id", inst.id);

        return json({ success: true, state: evoData?.instance?.state, status: newStatus });
      }

      // ─── List Instances (from DB) ─────────────────────────
      case "list": {
        const { data: instances } = await supabase
          .from("whatsapp_instances")
          .select("*")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false });

        return json({ success: true, instances: instances || [] });
      }

      // ─── Delete Instance ───────────────────────────────────
      case "delete": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName é obrigatório" }, 400);

        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("instance_name", instanceName)
          .single();
        if (!inst) return json({ error: "Instância não encontrada" }, 404);

        // Delete from Evolution API
        try {
          await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
            method: "DELETE",
            headers: evoHeaders,
          });
        } catch (e) {
          console.error("Evolution delete error (non-fatal):", e);
        }

        // Delete from DB
        await supabase.from("whatsapp_instances").delete().eq("id", inst.id);

        return json({ success: true });
      }

      // ─── Send Message ──────────────────────────────────────
      case "send_message": {
        const { instanceName, number, text } = body;
        if (!instanceName || !number || !text) {
          return json({ error: "instanceName, number e text são obrigatórios" }, 400);
        }

        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("id, status")
          .eq("tenant_id", tenant.id)
          .eq("instance_name", instanceName)
          .single();
        if (!inst) return json({ error: "Instância não encontrada" }, 404);
        if (inst.status !== "connected") return json({ error: "Instância não está conectada" }, 400);

        const evoRes = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: evoHeaders,
          body: JSON.stringify({ number, text }),
        });
        const evoData = await evoRes.json();

        if (!evoRes.ok) {
          return json({ error: "Erro ao enviar mensagem", details: evoData }, evoRes.status);
        }

        return json({ success: true, data: evoData });
      }

      // ─── Logout Instance ───────────────────────────────────
      case "logout": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName é obrigatório" }, 400);

        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("instance_name", instanceName)
          .single();
        if (!inst) return json({ error: "Instância não encontrada" }, 404);

        await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: "DELETE",
          headers: evoHeaders,
        });

        await supabase
          .from("whatsapp_instances")
          .update({ status: "disconnected", connected_at: null, qr_code: null })
          .eq("id", inst.id);

        return json({ success: true });
      }

      // ─── Set Webhook ──────────────────────────────────────
      case "set_webhook": {
        const { instanceName } = body;
        if (!instanceName) return json({ error: "instanceName é obrigatório" }, 400);

        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("instance_name", instanceName)
          .single();
        if (!inst) return json({ error: "Instância não encontrada" }, 404);

        const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

        const evoRes = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers: evoHeaders,
          body: JSON.stringify({
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: false,
            events: [
              "MESSAGES_UPSERT",
              "CONNECTION_UPDATE",
            ],
          }),
        });
        const evoData = await evoRes.json();

        if (!evoRes.ok) {
          return json({ error: "Erro ao configurar webhook", details: evoData }, evoRes.status);
        }

        return json({ success: true, webhookUrl, data: evoData });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (e) {
    console.error("evolution-api error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
