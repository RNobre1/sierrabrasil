import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body).slice(0, 500));

    // Evolution API sends different event types
    const event = body.event;
    const instanceName = body.instance;
    const data = body.data;

    if (!instanceName || !data) {
      return new Response(JSON.stringify({ ok: true, skipped: "no instance or data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle connection status updates
    if (event === "connection.update") {
      const state = data.state;
      const newStatus = state === "open" ? "connected" : state === "close" ? "disconnected" : "connecting";
      
      await supabase
        .from("whatsapp_instances")
        .update({
          status: newStatus,
          ...(newStatus === "connected" ? { connected_at: new Date().toISOString(), qr_code: null } : {}),
        })
        .eq("instance_name", instanceName);

      console.log(`Connection update: ${instanceName} → ${newStatus}`);
      return new Response(JSON.stringify({ ok: true, event: "connection.update", status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle incoming messages
    if (event === "messages.upsert") {
      const message = data.message || data;
      const key = message.key || {};
      const isFromMe = key.fromMe === true;
      
      // Skip messages sent by us
      if (isFromMe) {
        return new Response(JSON.stringify({ ok: true, skipped: "fromMe" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const remoteJid = key.remoteJid || "";
      // Skip group messages and status broadcasts
      if (remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
        return new Response(JSON.stringify({ ok: true, skipped: "group or status" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contactPhone = remoteJid.replace("@s.whatsapp.net", "");
      const messageContent = message.message?.conversation 
        || message.message?.extendedTextMessage?.text 
        || "";

      if (!messageContent) {
        return new Response(JSON.stringify({ ok: true, skipped: "no text content" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contactName = message.pushName || contactPhone;

      console.log(`Message from ${contactName} (${contactPhone}) on ${instanceName}: ${messageContent.slice(0, 100)}`);

      // 1. Find the WhatsApp instance and its tenant
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id")
        .eq("instance_name", instanceName)
        .single();

      if (!instance) {
        console.error(`Instance not found: ${instanceName}`);
        return new Response(JSON.stringify({ ok: false, error: "instance not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Find the tenant's active attendant
      const { data: attendant } = await supabase
        .from("attendants")
        .select("id, name, persona, instructions, model, temperature, active_skills")
        .eq("tenant_id", instance.tenant_id)
        .eq("status", "online")
        .limit(1)
        .single();

      if (!attendant) {
        console.log("No online attendant found for tenant:", instance.tenant_id);
        return new Response(JSON.stringify({ ok: true, skipped: "no online attendant" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Find or create conversation
      let conversationId: string;
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, human_takeover")
        .eq("tenant_id", instance.tenant_id)
        .eq("contact_phone", contactPhone)
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        // Check for human takeover
        if ((existingConv as any).human_takeover === true) {
          // Don't auto-respond, just save the message
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            role: "contact",
            content: messageContent,
          });
          console.log("Human takeover active, skipping AI response");
          return new Response(JSON.stringify({ ok: true, skipped: "human_takeover" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            tenant_id: instance.tenant_id,
            attendant_id: attendant.id,
            contact_name: contactName,
            contact_phone: contactPhone,
            channel: "whatsapp",
            status: "active",
          })
          .select("id")
          .single();

        if (convErr || !newConv) {
          console.error("Failed to create conversation:", convErr);
          return new Response(JSON.stringify({ ok: false, error: "failed to create conversation" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        conversationId = newConv.id;
      }

      // 4. Save incoming message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "contact",
        content: messageContent,
      });

      // 5. Get conversation history (last 20 messages)
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(20);

      // 6. Get knowledge base
      const { data: knowledge } = await supabase
        .from("knowledge_base")
        .select("content, source_type, source_name")
        .eq("attendant_id", attendant.id)
        .order("created_at", { ascending: false })
        .limit(30);

      // 7. Build system prompt with skills
      let knowledgeContext = "";
      if (knowledge && knowledge.length > 0) {
        const kbSections = knowledge.map((k) => {
          const tag = k.source_type === "social" ? "REDE SOCIAL" : k.source_type === "website" ? "SITE" : "DOCUMENTO";
          return `[${tag}: ${k.source_name}]\n${k.content}`;
        });
        knowledgeContext = `\n\n## BASE DE CONHECIMENTO\n${kbSections.join("\n\n---\n\n")}`;
      }

      // Build skills instructions
      const activeSkills: string[] = (attendant as any).active_skills ?? [];
      let skillsBlock = "";
      const skillInstructions: Record<string, string> = {
        "faq": "## SKILL: FAQ INTELIGENTE\nQuando identificar perguntas recorrentes ou frequentes, responda de forma direta e instantânea usando sua base de conhecimento, sem rodeios.",
        "greeting": "## SKILL: SAUDAÇÃO PERSONALIZADA\nAo iniciar uma conversa, envie uma saudação personalizada usando o nome do cliente. Adapte o tom ao horário (bom dia/boa tarde/boa noite).",
        "escalation": "## SKILL: ESCALONAMENTO HUMANO\nSe o cliente pedir para falar com um humano, demonstrar frustração extrema, ou o assunto estiver fora do seu escopo, diga: 'Vou transferir você para um atendente humano. Aguarde um momento.' e encerre sua participação.",
        "lead-capture": "## SKILL: CAPTURA DE LEADS\nDurante a conversa, identifique oportunidades naturais para coletar nome completo, email e telefone do cliente. Faça isso de forma sutil e contextualizada, nunca como um formulário.",
        "auto-reply": "## SKILL: RESPOSTA AUTOMÁTICA\nResponda todas as perguntas de forma contextualizada usando sua base de conhecimento e instruções.",
        "sentiment": "## SKILL: ANÁLISE DE SENTIMENTO\nAdapte o tom da resposta baseado no sentimento detectado na mensagem. Se frustrado, seja mais empático. Se positivo, seja mais entusiasmado.",
        "follow-up": "## SKILL: FOLLOW-UP\nSe o cliente não respondeu por muito tempo e volta, faça referência à conversa anterior e pergunte se pode ajudar com algo mais.",
      };
      for (const sk of activeSkills) {
        if (skillInstructions[sk]) {
          skillsBlock += "\n\n" + skillInstructions[sk];
        }
      }

      const systemPrompt = `## IDENTIDADE
Você é ${attendant.name}, agente virtual atendendo pelo WhatsApp.
${attendant.persona ? `Personalidade: ${attendant.persona}` : ""}

## REGRAS INVIOLÁVEIS
1. NUNCA invente informações. Use APENAS o que está nas instruções e na base de conhecimento.
2. NUNCA diga que é IA, robô ou bot. Você é ${attendant.name}.
3. Respostas curtas e diretas. Máximo 2 parágrafos.
4. Responda sempre em português brasileiro.
5. Se o cliente pedir humano, diga: "Vou transferir você para um atendente. Aguarde um momento."
6. Se não souber a resposta, diga que vai verificar com a equipe.
7. Quando mencionar preços ou serviços, use EXATAMENTE os valores da base de conhecimento.
8. NÃO use markdown (negrito, itálico, listas). WhatsApp não renderiza markdown.
9. Use emojis com moderação para parecer natural.

${attendant.instructions ? `## INSTRUÇÕES DO NEGÓCIO\n${attendant.instructions}` : ""}${skillsBlock}${knowledgeContext}`;

      // Convert message history to OpenAI format
      const aiMessages = (history || []).map((m) => ({
        role: m.role === "contact" ? "user" : "assistant",
        content: m.content,
      }));

      // 8. Call AI
      if (!OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY not configured");
        return new Response(JSON.stringify({ ok: false, error: "AI not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attendant.model || "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...aiMessages,
          ],
          temperature: attendant.temperature || 0.7,
          max_tokens: 500,
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("AI error:", aiResp.status, errText);
        return new Response(JSON.stringify({ ok: false, error: "AI error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      const aiReply = aiData.choices?.[0]?.message?.content || "";

      if (!aiReply) {
        console.error("Empty AI response");
        return new Response(JSON.stringify({ ok: false, error: "empty AI response" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 9. Save AI response as message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "attendant",
        content: aiReply,
      });

      // 10. Send reply via Evolution API
      if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
        const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
        const sendResp = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: contactPhone,
            text: aiReply,
          }),
        });

        if (!sendResp.ok) {
          const sendErr = await sendResp.text();
          console.error("Evolution send error:", sendResp.status, sendErr);
        } else {
          console.log(`Reply sent to ${contactPhone}: ${aiReply.slice(0, 100)}`);
        }
      }

      return new Response(JSON.stringify({ ok: true, replied: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Other events - just acknowledge
    return new Response(JSON.stringify({ ok: true, event, skipped: "unhandled event" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
