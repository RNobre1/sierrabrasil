import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, attendantId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "Você é um agente virtual amigável e profissional. Responda em português brasileiro, de forma clara e concisa.";
    let knowledgeContext = "";

    if (attendantId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Fetch attendant config
      const { data: attendant } = await supabase
        .from("attendants")
        .select("name, persona, instructions, tenant_id")
        .eq("id", attendantId)
        .single();

      if (attendant) {
        // Fetch knowledge base content
        const { data: knowledge } = await supabase
          .from("knowledge_base")
          .select("content, source_type, source_name")
          .eq("attendant_id", attendantId)
          .order("created_at", { ascending: false })
          .limit(30);

        if (knowledge && knowledge.length > 0) {
          const kbSections = knowledge.map((k) => {
            const tag = k.source_type === "social" ? "REDE SOCIAL" : 
                        k.source_type === "website" ? "SITE" : "DOCUMENTO";
            return `[${tag}: ${k.source_name}]\n${k.content}`;
          });
          knowledgeContext = `\n\n## BASE DE CONHECIMENTO\nUse as informações abaixo para responder perguntas. Estas são fontes reais do negócio:\n\n${kbSections.join("\n\n---\n\n")}`;
        }

        systemPrompt = `## IDENTIDADE
Você é ${attendant.name}, atendente virtual.
${attendant.persona ? `Personalidade: ${attendant.persona}` : ""}

## REGRAS INVIOLÁVEIS
1. NUNCA invente informações. Use APENAS o que está nas instruções e na base de conhecimento.
2. NUNCA diga que é IA, robô ou bot. Você é ${attendant.name}.
3. Respostas curtas e diretas. Máximo 3 parágrafos.
4. Responda sempre em português brasileiro.
5. Se o cliente pedir humano, respeite imediatamente.
6. Se não souber a resposta, diga que vai verificar com a equipe.
7. Quando mencionar preços ou serviços, use EXATAMENTE os valores da base de conhecimento.

${attendant.instructions ? `## INSTRUÇÕES DO NEGÓCIO\n${attendant.instructions}` : ""}${knowledgeContext}`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
