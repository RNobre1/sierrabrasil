import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple token approximation: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Memory token limits by plan (starter has no memory)
const MEMORY_TOKEN_LIMITS: Record<string, number> = {
  starter: 0,
  trial: 0,
  professional: 2000,
  business: 8000,
  enterprise: 8000,
};

function getMemoryTokenLimit(plan: string): number {
  return MEMORY_TOKEN_LIMITS[plan] ?? 0;
}

// Merge existing memory with new summarization data
function mergeMemories(
  existing: { summary: string; key_facts: Record<string, unknown>; conversations_count: number },
  newData: { summary: string; key_facts: Record<string, unknown> },
) {
  const existingFacts = existing.key_facts || {};
  const newFacts = newData.key_facts || {};

  // Filter out null/undefined values from new facts
  const filteredNewFacts = Object.fromEntries(
    Object.entries(newFacts).filter(([_, v]) => v !== null && v !== undefined),
  );

  // Merge arrays (append unique values, don't replace)
  const mergedPainPoints = [
    ...new Set([
      ...((existingFacts.pain_points as string[]) || []),
      ...((newFacts.pain_points as string[]) || []),
    ]),
  ];
  const mergedPreferencias = [
    ...new Set([
      ...((existingFacts.preferencias as string[]) || []),
      ...((newFacts.preferencias as string[]) || []),
    ]),
  ];

  return {
    summary: `${existing.summary}\n\n[${new Date().toLocaleDateString("pt-BR")}] ${newData.summary}`,
    key_facts: {
      ...existingFacts,
      ...filteredNewFacts,
      pain_points: mergedPainPoints,
      preferencias: mergedPreferencias,
    },
    conversations_count: existing.conversations_count + 1,
    last_interaction_at: new Date().toISOString(),
  };
}

// Compress summary by keeping only the last 3 conversation entries
function compressSummary(summary: string): string {
  const entries = summary.split(/\n\n(?=\[)/);
  if (entries.length <= 3) return summary;
  return entries.slice(-3).join("\n\n");
}

const SUMMARIZATION_PROMPT = `Voce e um assistente especializado em extrair insights de conversas de atendimento.

Analise a conversa abaixo e extraia:

1. Identificacao: Nome completo, empresa, cargo (se mencionado)
2. Necessidade: O que o cliente quer/precisa
3. Pain Points: Problemas ou frustracoes mencionados
4. Preferencias: Planos de interesse, features importantes, restricoes (orcamento, prazo)
5. Historico: Se mencionou compras anteriores, status de pedidos
6. Sentimento geral: positivo/neutro/negativo
7. Proximos passos: Follow-ups acordados, pendencias

REGRAS:
- Extraia APENAS fatos explicitamente mencionados
- NAO invente ou infira informacoes
- Se algo nao foi mencionado, deixe vazio
- Use texto conciso e objetivo
- Priorize informacoes uteis para conversas futuras

Conversa:
{MENSAGENS}

Responda APENAS com JSON valido:
{
  "summary": "Resumo conciso em 2-3 frases do que aconteceu na conversa",
  "key_facts": {
    "nome": "nome do contato ou null",
    "empresa": "empresa ou null",
    "necessidade": "o que o cliente precisa",
    "pain_points": ["lista de problemas mencionados"],
    "preferencias": ["preferencias mencionadas"],
    "sentimento": "positivo|neutro|negativo",
    "proximos_passos": "proximos passos acordados ou null"
  }
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Fetch the conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, attendant_id, contact_phone, contact_name, tenant_id")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      console.error("Conversation not found:", convError?.message);
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { attendant_id, contact_phone, tenant_id } = conversation;

    if (!attendant_id || !contact_phone) {
      console.log("Missing attendant_id or contact_phone, skipping summarization");
      return new Response(
        JSON.stringify({ ok: true, skipped: "missing_attendant_or_contact" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Check if the tenant's plan allows memory
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("plan")
      .eq("id", tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error("Tenant not found:", tenantError?.message);
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tokenLimit = getMemoryTokenLimit(tenant.plan);

    // 3. If limit is 0, skip — no memory for this plan
    if (tokenLimit === 0) {
      console.log(`Plan '${tenant.plan}' does not support memory, skipping`);
      return new Response(
        JSON.stringify({ ok: true, skipped: "plan_no_memory", plan: tenant.plan }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Fetch all messages from the conversation
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (msgError || !messages || messages.length === 0) {
      console.log("No messages found for conversation:", conversation_id);
      return new Response(
        JSON.stringify({ ok: true, skipped: "no_messages" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Format messages for the prompt
    const formattedMessages = messages
      .map((m) => {
        const role = m.role === "contact" ? (conversation.contact_name || "Cliente") : "Agente";
        return `${role}: ${m.content}`;
      })
      .join("\n");

    // 5. Call GPT-4.1-Mini for summarization
    const prompt = SUMMARIZATION_PROMPT.replace("{MENSAGENS}", formattedMessages);

    const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1-mini",
        temperature: 0.1,
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI summarization error:", aiResp.status, errText);
      return new Response(
        JSON.stringify({ error: "AI summarization failed", status: aiResp.status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResp.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // 6. Parse the JSON response
    let parsed: { summary: string; key_facts: Record<string, unknown> };
    try {
      // Strip markdown code fences if present
      const cleaned = rawContent.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI JSON response:", rawContent.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse summarization response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!parsed.summary || !parsed.key_facts) {
      console.error("Invalid summarization structure:", JSON.stringify(parsed).slice(0, 300));
      return new Response(
        JSON.stringify({ error: "Invalid summarization structure" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7. Check for existing memory for this attendant+contact
    const { data: existingMemory } = await supabase
      .from("agent_memories")
      .select("id, summary, key_facts, conversations_count")
      .eq("attendant_id", attendant_id)
      .eq("contact_phone", contact_phone)
      .maybeSingle();

    let finalSummary: string;
    let finalKeyFacts: Record<string, unknown>;
    let conversationsCount: number;

    if (existingMemory) {
      // Merge with existing memory
      const merged = mergeMemories(
        {
          summary: existingMemory.summary || "",
          key_facts: (existingMemory.key_facts as Record<string, unknown>) || {},
          conversations_count: existingMemory.conversations_count || 0,
        },
        parsed,
      );
      finalSummary = merged.summary;
      finalKeyFacts = merged.key_facts;
      conversationsCount = merged.conversations_count;
    } else {
      // New memory
      finalSummary = `[${new Date().toLocaleDateString("pt-BR")}] ${parsed.summary}`;
      finalKeyFacts = parsed.key_facts;
      conversationsCount = 1;
    }

    // 8. Calculate token count and compress if exceeding plan limit
    let tokenCount = estimateTokens(finalSummary + JSON.stringify(finalKeyFacts));

    if (tokenCount > tokenLimit) {
      console.log(`Token count ${tokenCount} exceeds limit ${tokenLimit}, compressing`);
      finalSummary = compressSummary(finalSummary);
      tokenCount = estimateTokens(finalSummary + JSON.stringify(finalKeyFacts));
    }

    // Upsert into agent_memories
    const memoryData = {
      attendant_id,
      contact_phone,
      summary: finalSummary,
      key_facts: finalKeyFacts,
      conversations_count: conversationsCount,
      last_interaction_at: new Date().toISOString(),
      token_count: tokenCount,
    };

    if (existingMemory) {
      const { error: updateErr } = await supabase
        .from("agent_memories")
        .update(memoryData)
        .eq("id", existingMemory.id);

      if (updateErr) {
        console.error("Failed to update memory:", updateErr.message);
        return new Response(
          JSON.stringify({ error: "Failed to update memory" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log(`Memory updated for attendant=${attendant_id} contact=${contact_phone} (conversations: ${conversationsCount}, tokens: ${tokenCount})`);
    } else {
      const { error: insertErr } = await supabase
        .from("agent_memories")
        .insert(memoryData);

      if (insertErr) {
        console.error("Failed to insert memory:", insertErr.message);
        return new Response(
          JSON.stringify({ error: "Failed to insert memory" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log(`Memory created for attendant=${attendant_id} contact=${contact_phone} (tokens: ${tokenCount})`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        memory: {
          attendant_id,
          contact_phone,
          conversations_count: conversationsCount,
          token_count: tokenCount,
          compressed: tokenCount > tokenLimit,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("summarize-conversation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
