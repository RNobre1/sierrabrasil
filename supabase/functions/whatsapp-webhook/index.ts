import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// === CAMADA 1: Identidade e Seguranca (fixo) ===
const getLayer1 = (agentName: string) => `## QUEM VOCE E
Voce e ${agentName}, agente virtual atendendo pelo WhatsApp.
Voce e reativo: responde mensagens, nunca inicia conversa.

## REGRAS INVIOLAVEIS
1. ANTI-ALUCINACAO TOTAL: Voce SO pode afirmar fatos que estejam LITERALMENTE na BASE DE CONHECIMENTO. Se um plano, preco, servico ou politica nao esta nos documentos, ele NAO EXISTE. Nunca invente, aproxime ou extrapole valores.
2. NUNCA diga que e IA, robo ou bot. Voce e ${agentName}.
3. PRECOS: Use EXATAMENTE os valores dos documentos oficiais. Se o cliente perguntar um preco que nao esta na base, diga: "Vou confirmar o valor exato com a equipe e ja te retorno."
4. CONFLITO DE FONTES: Se encontrar valores diferentes entre fontes, use SEMPRE o DOCUMENTO OFICIAL (maior prioridade). Ignore precos de redes sociais ou site se conflitarem.
5. SE NAO SABE: Diga "Vou verificar com a equipe e ja te retorno." Isso e MELHOR do que inventar. Use essa frase para qualquer duvida legitima sobre o negocio que voce nao tem certeza.
6. Voce SO pode enviar TEXTO. NUNCA prometa enviar fotos, imagens, videos ou audios. Se pedirem, diga que pode descrever por texto ou que a equipe envia.

## TAGS DE CONTROLE (invisivel pro cliente)
Adicione a tag [RESOLVED] no FINAL da resposta quando o cliente agradece e se despede, o problema foi resolvido, ou o cliente confirma que nao precisa de mais nada. NUNCA explique a tag pro cliente.
Se a conversa continua normalmente, NAO use nenhuma tag.

## FORMATO WHATSAPP
- SEM formatacao Markdown (sem **, sem ##, sem listas numeradas).
- Mensagens CURTAS: 1-3 frases. Se precisar de mais, use o delimitador [BREAK] para separar.
- Use emojis com moderacao (1-2 por mensagem, nem sempre).

## HUMANIZACAO PT-BR
- Contracoes naturais: "pra", "ta", "ne", "to".
- Interjeicoes: "Opa!", "Claro!", "Entendi!", "Show!".
- NUNCA: "Compreendo sua solicitacao", "Gostaria de informar", "Desculpe pelo inconveniente".
- Se frustrado, seja empatico: "Poxa, sinto muito por isso".
- Se o cliente perguntar algo completamente fora do contexto do negocio, responda com bom humor e redirecione pra o tema do negocio.`;

// Helper: send typing indicator
async function sendComposing(baseUrl: string, apiKey: string, instanceName: string, phone: string) {
  try {
    await fetch(`${baseUrl}/chat/updatePresence/${instanceName}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number: phone, presence: "composing" }),
    });
  } catch (e) {
    console.warn("composing error (non-fatal):", e);
  }
}

// Helper: send text message
async function sendText(baseUrl: string, apiKey: string, instanceName: string, phone: string, text: string) {
  const resp = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ number: phone, text }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    console.error("Evolution send error:", resp.status, err);
  }
  return resp.ok;
}

// Helper: delay
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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

    const event = body.event;
    const instanceName = body.instance;
    const data = body.data;

    if (!instanceName || !data) {
      return new Response(JSON.stringify({ ok: true, skipped: "no instance or data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === CONNECTION UPDATE ===
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

      console.log(`Connection update: ${instanceName} -> ${newStatus}`);
      return new Response(JSON.stringify({ ok: true, event: "connection.update", status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === INCOMING MESSAGE ===
    if (event === "messages.upsert") {
      // v1.8.x: data is the message object (with key, pushName, message, messageType)
      // Some versions send data as array — handle both
      const msgData = Array.isArray(data) ? data[0] : data;

      if (!msgData) {
        return new Response(JSON.stringify({ ok: true, skipped: "empty data" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const key = msgData.key || {};

      // Skip own messages, groups, status broadcasts
      if (key.fromMe === true) {
        return new Response(JSON.stringify({ ok: true, skipped: "fromMe" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const remoteJid = key.remoteJid || "";
      if (remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
        return new Response(JSON.stringify({ ok: true, skipped: "group or status" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // v2.3.6+: resolve LID using remoteJidAlt or senderPn when available
      const lidPhone = remoteJid.replace(/@.*$/, "");
      const resolvedJid = (remoteJid.endsWith("@lid")
        ? (key.remoteJidAlt || key.senderPn || remoteJid)
        : remoteJid);
      const contactPhone = resolvedJid.replace(/@.*$/, "");
      const wasLidResolved = remoteJid.endsWith("@lid") && contactPhone !== lidPhone;
      const messageContent = msgData.message?.conversation
        || msgData.message?.extendedTextMessage?.text
        || "";

      if (!messageContent) {
        console.log("No text content. msgData keys:", Object.keys(msgData), "message keys:", msgData.message ? Object.keys(msgData.message) : "none");
        return new Response(JSON.stringify({ ok: true, skipped: "no text content" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contactName = msgData.pushName || contactPhone;
      console.log(`Message from ${contactName} (${contactPhone}): ${messageContent.slice(0, 100)}`);

      // 1. Find instance and tenant
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("id, tenant_id, attendant_id")
        .eq("instance_name", instanceName)
        .single();

      if (!instance) {
        console.error(`Instance not found: ${instanceName}`);
        return new Response(JSON.stringify({ ok: false, error: "instance not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Find the attendant linked to this instance (or fallback to first online)
      let attendantQuery = supabase
        .from("attendants")
        .select(`id, name, persona, instructions, model, temperature, active_skills,
          agent_templates ( prompt_template )`)
        .eq("status", "online")
        .limit(1)
        .single();

      if (instance.attendant_id) {
        // Use the specific agent linked to this WhatsApp number — must be online
        attendantQuery = supabase
          .from("attendants")
          .select(`id, name, persona, instructions, model, temperature, active_skills,
            agent_templates ( prompt_template )`)
          .eq("id", instance.attendant_id)
          .eq("status", "online")
          .single();
      } else {
        // No agent linked — don't respond
        console.log(`Instance ${instanceName} has no linked agent, skipping`);
        return new Response(JSON.stringify({ ok: true, skipped: "no_agent_linked" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: attendant } = await attendantQuery;

      if (!attendant) {
        console.log("Agent linked to instance is offline or not found:", instance.attendant_id);
        return new Response(JSON.stringify({ ok: true, skipped: "agent_offline" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Find or create conversation (try resolved phone first, fallback to LID)
      let conversationId: string;
      let existingConv = null as any;

      const { data: conv1 } = await supabase
        .from("conversations")
        .select("id, human_takeover, contact_phone, status")
        .eq("tenant_id", instance.tenant_id)
        .eq("contact_phone", contactPhone)
        .in("status", ["active", "escalated"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      existingConv = conv1;

      // If LID was resolved, also check for conversation with old LID phone
      if (!existingConv && wasLidResolved) {
        const { data: conv2 } = await supabase
          .from("conversations")
          .select("id, human_takeover, contact_phone, status")
          .eq("tenant_id", instance.tenant_id)
          .eq("contact_phone", lidPhone)
          .in("status", ["active", "escalated"])
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (conv2) {
          existingConv = conv2;
          // Update the phone to the real number
          await supabase.from("conversations").update({ contact_phone: contactPhone }).eq("id", conv2.id);
          console.log(`Updated conversation ${conv2.id} phone: ${lidPhone} -> ${contactPhone}`);
        }
      }

      if (existingConv) {
        // Escalated + human_takeover: save message but don't respond (human is handling)
        if (existingConv.status === "escalated" && (existingConv as any).human_takeover === true) {
          conversationId = existingConv.id;
          await supabase.from("messages").insert({
            conversation_id: conversationId, role: "contact", content: messageContent,
          });
          console.log("Human takeover active, skipping AI");
          return new Response(JSON.stringify({ ok: true, skipped: "human_takeover" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Escalated but returned to agent: archive the escalated conversation and create new active one
        if (existingConv.status === "escalated" && !(existingConv as any).human_takeover) {
          console.log(`Archiving escalated conversation ${existingConv.id}, creating new active`);
          existingConv = null; // Force creation of new conversation below
        } else {
          conversationId = existingConv.id;
        }
      }

      if (!existingConv) {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            tenant_id: instance.tenant_id, attendant_id: attendant.id,
            contact_name: contactName, contact_phone: contactPhone,
            channel: "whatsapp", status: "active",
          })
          .select("id")
          .single();

        if (convErr || !newConv) {
          console.error("Failed to create conversation:", convErr);
          return new Response(JSON.stringify({ ok: false, error: "failed to create conversation" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        conversationId = newConv.id;
      }

      // 4. Save incoming message
      await supabase.from("messages").insert({
        conversation_id: conversationId, role: "contact", content: messageContent,
      });

      // 5. Send typing indicator
      const baseUrl = EVOLUTION_API_URL?.replace(/\/$/, "") || "";
      if (baseUrl && EVOLUTION_API_KEY) {
        await sendComposing(baseUrl, EVOLUTION_API_KEY, instanceName, contactPhone);
      }

      // 6. Get conversation history (last 20)
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(20);

      // 6b. Memory: load persistent context for this contact
      let memoryContext = "";
      const { data: memory } = await supabase
        .from("agent_memories")
        .select("summary, key_facts, last_interaction_at, conversations_count")
        .eq("attendant_id", attendant.id)
        .eq("contact_phone", contactPhone)
        .single();

      if (memory) {
        const daysSince = Math.floor((Date.now() - new Date(memory.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24));
        const facts = memory.key_facts || {};

        memoryContext = `\n\n## MEMORIA DO CONTATO (voce ja conversou com esta pessoa antes)
Voce ja conversou com ${facts.nome || contactName} ${memory.conversations_count} vez(es). Ultima interacao: ${daysSince === 0 ? "hoje" : `${daysSince} dia(s) atras`}.

${facts.nome ? `Nome: ${facts.nome}` : ""}
${facts.empresa ? `Empresa: ${facts.empresa}` : ""}
${facts.necessidade ? `Necessidade: ${facts.necessidade}` : ""}
${facts.preferencias?.length ? `Preferencias: ${facts.preferencias.join(", ")}` : ""}
${facts.pain_points?.length ? `Problemas mencionados: ${facts.pain_points.join(", ")}` : ""}
${facts.proximos_passos ? `Pendencias: ${facts.proximos_passos}` : ""}

Historico resumido: ${memory.summary || "Sem resumo disponivel."}

Use essas informacoes naturalmente. NAO mencione que esta "lendo memorias". Demonstre continuidade.`.trim();
      }

      // 7. Build 4-layer system prompt
      // --- Layer 1: Identity ---
      const layer1 = getLayer1(attendant.name);

      // --- Layer 2: Template ---
      let layer2 = "";
      const templateData = attendant.agent_templates;
      const promptTemplate = Array.isArray(templateData)
        ? templateData[0]?.prompt_template
        : (templateData as any)?.prompt_template;

      if (promptTemplate) {
        layer2 = `\n\n${promptTemplate}`;
      }

      // --- Layer 3: Business ---
      let layer3 = "";
      if (attendant.persona || attendant.instructions) {
        layer3 = "\n\n## INSTRUCOES DO NEGOCIO";
        if (attendant.persona) layer3 += `\nPersonalidade: ${attendant.persona}`;
        if (attendant.instructions) layer3 += `\n${attendant.instructions}`;
      }

      // --- Layer 4: Dynamic context ---
      const tzHour = (new Date().getUTCHours() - 3 + 24) % 24;
      let greeting = "Bom dia";
      if (tzHour >= 12 && tzHour < 18) greeting = "Boa tarde";
      else if (tzHour >= 18 || tzHour < 6) greeting = "Boa noite";

      const activeSkills: string[] = (attendant as any).active_skills ?? [];
      const hasGreeting = activeSkills.includes("greeting");

      let layer4 = hasGreeting
        ? `\n\n## CONTEXTO\nSaudacao: use "${greeting}" personalizado com o nome do cliente (${contactName}) na primeira interacao.`
        : `\n\n## CONTEXTO`;

      // Knowledge base — tsvector-based RAG retrieval
      let knowledge: any[] = [];
      let ragFallbackUsed = false;
      if (messageContent) {
        const { data: relevant } = await supabase.rpc('search_knowledge', {
          p_attendant_id: attendant.id,
          p_query: messageContent,
          p_limit: 12,
        });
        if (relevant && relevant.length >= 3) {
          knowledge = relevant;
        }
      }

      // Fallback: high-priority recent chunks if retrieval found too few
      if (knowledge.length < 3) {
        const { data: fallback } = await supabase
          .from("knowledge_base")
          .select("content, source_type, source_name")
          .eq("attendant_id", attendant.id)
          .eq("is_archived", false)
          .order("source_priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(8);
        knowledge = fallback || [];
        ragFallbackUsed = true;
      }

      if (knowledge.length > 0) {
        const kbSections = knowledge.map((k: any) => {
          const tag = k.source_type === "social" ? "REDE SOCIAL" : k.source_type === "website" ? "SITE" : "DOCUMENTO";
          return `[${tag}: ${k.source_name}]\n${k.content}`;
        });
        layer4 += `\n\n## BASE DE CONHECIMENTO\nAs informacoes abaixo sao fontes OFICIAIS do negocio e PREVALECEM sobre qualquer outro conhecimento. Use APENAS estes dados para responder sobre precos, planos, servicos e politicas. Se a informacao nao esta aqui, diga que vai verificar com a equipe.\n\n${kbSections.join("\n\n---\n\n")}`;
      }

      // --- FAQ Data ---
      if (activeSkills.includes("faq")) {
        const { data: faqs } = await supabase
          .from("agent_faqs")
          .select("question, answer")
          .eq("attendant_id", attendant.id)
          .eq("is_active", true)
          .limit(50);

        if (faqs && faqs.length > 0) {
          const faqLines = faqs.map((f: any) => `P: ${f.question}\nR: ${f.answer}`).join("\n\n");
          layer4 += `\n\n## PERGUNTAS FREQUENTES (FAQ)\nSe o cliente perguntar algo parecido com as perguntas abaixo, use EXATAMENTE a resposta correspondente (adaptando apenas o tom):\n\n${faqLines}`;
        }
      }

      // Skills — maps skill IDs to prompt instructions
      const skillMap: Record<string, string> = {
        "greeting": `Use "${greeting}" personalizado com o nome do cliente (${contactName}) na primeira interacao.`,
        "escalation": "Se o cliente pedir humano, demonstrar frustracao extrema, assunto fora do escopo, ou voce nao conseguir resolver apos 2 tentativas, diga algo como 'Vou te transferir pra um atendente. Aguarda um momento.' e adicione a tag [ESCALATE] no FINAL da resposta. NUNCA explique a tag pro cliente.",
        "lead-capture": "Identifique oportunidades naturais pra coletar nome, email e telefone do cliente. Faca de forma sutil e conversacional. Quando coletar qualquer dado, adicione no FINAL da resposta (invisivel pro cliente): [LEAD: nome=X | email=Y | telefone=Z]. Preencha apenas os campos que conseguiu.",
        "sentiment": "Analise o sentimento do cliente em cada mensagem. Adapte o tom: frustrado = mais empatico e cuidadoso, positivo = mais animado e casual, neutro = equilibrado. No FINAL da resposta, adicione (invisivel pro cliente): [SENTIMENT: positivo|neutro|negativo|frustrado].",
        "follow-up": "Se o cliente volta apos um tempo, faca referencia a conversa anterior de forma natural (ex: 'E ai, resolveu aquela questao?'). Mostre que lembra do contexto.",
        "multi-language": "REGRA PRIORITARIA DE IDIOMA (sobrepoe a secao de humanizacao PT-BR acima): Detecte o idioma da ULTIMA mensagem do cliente. Se NAO for portugues, IGNORE todas as instrucoes de tom PT-BR e responda INTEIRAMENTE no idioma do cliente. NUNCA misture idiomas. Naturalidade: Ingles (I'm, don't, gonna, no worries, got it, sounds good), Espanhol (vale, genial, dale, tranqui, pa' que), Frances (j'suis, t'inquiete, super, nickel, bref), Italiano (figurati, dai, magari), Alemao (klar, genau, passt). Mantenha o MESMO nivel de informalidade e emojis que usaria em portugues.",
        "faq": "Quando houver dados de FAQ fornecidos no contexto, priorize respostas da FAQ antes de elaborar com IA generativa. Respostas de FAQ devem ser usadas diretamente, adaptando apenas o tom conversacional.",
      };
      const skillLines = activeSkills.map(s => skillMap[s]).filter(Boolean);
      if (skillLines.length > 0) {
        layer4 += `\n\n## HABILIDADES ATIVAS\n${skillLines.map(s => `- ${s}`).join("\n")}`;
      }

      const systemPrompt = `${layer1}${memoryContext}${layer2}${layer3}${layer4}`;

      // 8. Call AI
      if (!OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY not configured");
        return new Response(JSON.stringify({ ok: false, error: "AI not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiMessages = (history || []).map((m) => ({
        role: m.role === "contact" ? "user" : "assistant",
        content: m.content,
      }));

      const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attendant.model || "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, ...aiMessages],
          temperature: attendant.temperature ?? 0.2,
          max_tokens: 500,
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("AI error:", aiResp.status, errText);
        return new Response(JSON.stringify({ ok: false, error: "AI error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      const aiReply = aiData.choices?.[0]?.message?.content || "";

      if (!aiReply) {
        console.error("Empty AI response");
        return new Response(JSON.stringify({ ok: false, error: "empty AI response" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 8b. Grounding check — verify factual claims against knowledge base
      let finalReply = aiReply;
      // Only trigger grounding check when the AI response contains SPECIFIC factual claims (prices, plan details with numbers)
      const mentionsFactual = /R\$\s*\d|reais|(\d+\s*(mega|mb|gb))|instalação.*grát|fidelidade.*\d|preco.*\d|preço.*\d|\d+[.,]\d{2}/i.test(aiReply);
      if (mentionsFactual && knowledge.length > 0 && OPENROUTER_API_KEY) {
        try {
          const kbContext = knowledge.map((k: any) => k.content).join("\n---\n").slice(0, 4000);
          const verifyResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "anthropic/claude-haiku-4-5",
              temperature: 0,
              max_tokens: 100,
              messages: [{
                role: "user",
                content: `Verifique se TODAS as informacoes factuais (precos, planos, servicos, valores) da RESPOSTA estao suportadas pelo CONTEXTO. Responda APENAS "OK" se tudo estiver correto, ou "FALHA" se houver qualquer informacao inventada, aproximada ou nao presente no contexto.\n\nCONTEXTO:\n${kbContext}\n\nRESPOSTA:\n${aiReply.slice(0, 1000)}`
              }]
            }),
          });
          if (verifyResp.ok) {
            const verifyData = await verifyResp.json();
            const verdict = verifyData.choices?.[0]?.message?.content || "";
            if (verdict.toUpperCase().includes("FALHA")) {
              console.warn(`Grounding check FAILED for conversation ${conversationId}: ${verdict}`);
              if (activeSkills.includes("escalation")) {
                finalReply = "Vou te transferir pra um atendente que consegue te passar os detalhes certinhos. Aguarda um momento! [ESCALATE]";
              } else {
                finalReply = "Vou confirmar os detalhes exatos com a equipe e ja te retorno! Um momento.";
              }
            } else {
              console.log(`Grounding check OK for conversation ${conversationId}`);
            }
          }
        } catch (e) {
          console.warn("Grounding check error (non-fatal):", e);
          // Non-fatal: if check fails, send original reply
        }
      }

      // 9. Parse control tags and clean reply
      const hasEscalate = finalReply.includes("[ESCALATE]");
      const hasResolved = finalReply.includes("[RESOLVED]");

      // Parse [LEAD: nome=X | email=Y | telefone=Z]
      const leadMatch = aiReply.match(/\[LEAD:\s*([^\]]+)\]/);
      let leadData: Record<string, string> | null = null;
      if (leadMatch) {
        leadData = {};
        for (const part of leadMatch[1].split("|")) {
          const [key, ...val] = part.split("=");
          if (key && val.length > 0) {
            leadData[key.trim().toLowerCase()] = val.join("=").trim();
          }
        }
      }

      // Parse [SENTIMENT: positivo|neutro|negativo|frustrado]
      const sentimentMatch = aiReply.match(/\[SENTIMENT:\s*(positivo|neutro|negativo|frustrado)\s*\]/i);
      const sentiment = sentimentMatch ? sentimentMatch[1].toLowerCase() : null;

      const cleanReply = finalReply
        .replace(/\s*\[ESCALATE\]\s*/g, "")
        .replace(/\s*\[RESOLVED\]\s*/g, "")
        .replace(/\s*\[LEAD:\s*[^\]]*\]\s*/g, "")
        .replace(/\s*\[SENTIMENT:\s*[^\]]*\]\s*/g, "")
        .trim();

      // 10. Save cleaned AI response (with sentiment metadata if detected)
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "attendant",
        content: cleanReply,
        ...(sentiment ? { metadata: { sentiment } } : {}),
      } as any);

      // 10b. Save lead data if captured
      if (leadData && Object.keys(leadData).length > 0) {
        const { error: leadErr } = await supabase.from("agent_leads").upsert({
          tenant_id: instance.tenant_id,
          attendant_id: attendant.id,
          conversation_id: conversationId,
          contact_phone: contactPhone,
          contact_name: leadData.nome || contactName,
          contact_email: leadData.email || null,
          source: "whatsapp",
        } as any, { onConflict: "tenant_id,contact_phone" });
        if (leadErr) {
          console.warn("Lead save error (non-fatal):", leadErr.message);
        } else {
          console.log(`Lead captured: ${JSON.stringify(leadData)}`);
        }
      }

      // 10c. Log negative sentiment for operator alerts
      if (sentiment === "negativo" || sentiment === "frustrado") {
        console.log(`⚠️ Negative sentiment (${sentiment}) in conversation ${conversationId}`);
      }

      // 11. Update conversation status based on AI tags
      if (hasEscalate) {
        // Increment escalation_count + set escalated status
        const { data: currentConv } = await supabase
          .from("conversations")
          .select("escalation_count")
          .eq("id", conversationId)
          .single();
        const currentCount = (currentConv as any)?.escalation_count ?? 0;

        await supabase.from("conversations").update({
          status: "escalated",
          human_takeover: true,
          takeover_at: new Date().toISOString(),
          escalation_count: currentCount + 1,
        } as any).eq("id", conversationId);
        console.log(`Conversation ${conversationId} ESCALATED by AI (count: ${currentCount + 1})`);

        // Trigger memory summarization on escalation too (agent collected info before escalating)
        try {
          fetch(`${SUPABASE_URL}/functions/v1/summarize-conversation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ conversation_id: conversationId }),
          }).catch(e => console.warn("Memory summarization on escalate failed (non-fatal):", e));
        } catch (e) {
          console.warn("Memory summarization on escalate failed (non-fatal):", e);
        }
      } else if (hasResolved) {
        await supabase.from("conversations").update({
          status: "resolved",
          ended_at: new Date().toISOString(),
        }).eq("id", conversationId);
        console.log(`Conversation ${conversationId} RESOLVED by AI`);

        // Trigger memory summarization (fire-and-forget)
        try {
          fetch(`${SUPABASE_URL}/functions/v1/summarize-conversation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ conversation_id: conversationId }),
          }).catch(e => console.warn("Memory summarization trigger failed (non-fatal):", e));
        } catch (e) {
          console.warn("Memory summarization trigger failed (non-fatal):", e);
        }
      }

      // 12. Send reply with message splitting on [BREAK]
      if (baseUrl && EVOLUTION_API_KEY) {
        const parts = cleanReply.split("[BREAK]").map((p: string) => p.trim()).filter((p: string) => p.length > 0);

        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            await sendComposing(baseUrl, EVOLUTION_API_KEY, instanceName, contactPhone);
            await sleep(1500);
          }
          await sendText(baseUrl, EVOLUTION_API_KEY, instanceName, contactPhone, parts[i]);
          console.log(`Reply ${i + 1}/${parts.length} sent to ${contactPhone}: ${parts[i].slice(0, 80)}`);
        }
      }

      return new Response(JSON.stringify({ ok: true, replied: true, escalated: hasEscalate, resolved: hasResolved }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Other events
    return new Response(JSON.stringify({ ok: true, event, skipped: "unhandled event" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
