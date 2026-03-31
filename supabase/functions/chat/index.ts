import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === CAMADA 1: Identidade e Segurança (fixo) ===
const getLayer1Identity = (agentName: string) => `## CAMADA 1: QUEM VOCÊ É
Você é ${agentName}, agente virtual. Seu papel é conduzir um atendimento natural e atuar apenas de forma reativa (respondendo e auxiliando diretamente a demanda do cliente).

## REGRAS INVIOLÁVEIS E FORMATO
1. ANTI-ALUCINAÇÃO: NUNCA invente informações. Use APENAS o que está nas instruções e na base de conhecimento.
2. DESCONHECIDO: Se não tiver a resposta exata, diga: "Vou verificar com a equipe e já te retorno".
3. CAPACIDADE: Você SÓ pode enviar TEXTO. NUNCA prometa enviar fotos, imagens, vídeos, áudios ou documentos. Você NÃO tem essa capacidade. Se o cliente pedir, diga que pode descrever por texto ou que a equipe pode enviar.
4. WHATSAPP: SEM formatação Markdown (sem **, sem ##). Texto puro, respostas curtas de 1 a 3 frases.
5. DELIMITADOR: Se a resposta for longa, separe as mensagens usando EXATAMENTE o delimitador [BREAK].

## HUMANIZAÇÃO E TOM (PT-BR)
- Escreva como um humano no WhatsApp: use contrações naturais ("pra", "tá", "né", "tô").
- Use emojis com moderação (máximo de 1 a 2 por mensagem).
- Utilize interjeições casuais de empatia ("Opa!", "Claro!", "Entendi!").
- NUNCA use linguagem robótica ou extremamente formal como "Compreendo sua solicitação" ou "Gostaria de informar".
- Se o cliente perguntar algo completamente fora do contexto do negócio (ex: "qual a distância do sol?"), responda com bom humor e redirecione: "Haha boa pergunta! Mas minha especialidade é [tema do negócio]. Posso te ajudar com alguma coisa por aqui?"
- NÃO diga "vou verificar com a equipe" pra perguntas claramente fora do escopo. Isso é pra dúvidas legítimas sobre o negócio que você não sabe responder.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, attendantId } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    let systemPrompt = "Você é um agente virtual amigável.";
    let activeModel = "google/gemini-3-flash-preview"; 
    let activeTemperature = 0.5; 

    if (attendantId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Fetch attendant config including 4 layers context
      const { data: attendant } = await supabase
        .from("attendants")
        .select(`
          name, 
          persona, 
          instructions, 
          tenant_id,
          model,
          temperature,
          agent_templates ( prompt_template )
        `)
        .eq("id", attendantId)
        .single();

      if (attendant) {
        if (attendant.model) activeModel = attendant.model;
        if (attendant.temperature !== undefined && attendant.temperature !== null) {
          activeTemperature = attendant.temperature;
        }

        // --- LAYER 1 ---
        const layer1 = getLayer1Identity(attendant.name || "o assistente");

        // --- LAYER 2: Template de Especialidade ---
        let layer2 = "";
        const templateData = attendant.agent_templates;
        const promptTemplate = Array.isArray(templateData) 
          ? templateData[0]?.prompt_template 
          : (templateData as any)?.prompt_template;

        if (promptTemplate) {
          layer2 = `\n\n## CAMADA 2: ESPECIALIDADE DO AGENTE\n${promptTemplate}`;
        } else {
          layer2 = `\n\n## CAMADA 2: ESPECIALIDADE DO AGENTE\nVocê é um agente de atendimento geral focado em resolver as dúvidas do usuário de forma clara e amigável.`;
        }

        // --- LAYER 3: Personalização do Negócio ---
        let layer3 = "";
        if (attendant.persona || attendant.instructions) {
          layer3 = "\n\n## CAMADA 3: INSTRUÇÕES DO NEGÓCIO";
          if (attendant.persona) layer3 += `\nPersonalidade: ${attendant.persona}`;
          if (attendant.instructions) layer3 += `\nInstruções Específicas:\n${attendant.instructions}`;
        }

        // --- LAYER 4: Contexto Dinâmico ---
        // Calcula horário UTC-3 para saudação local
        const tzHour = (new Date().getUTCHours() - 3 + 24) % 24; 
        let greeting = "Bom dia";
        if (tzHour >= 12 && tzHour < 18) greeting = "Boa tarde";
        else if (tzHour >= 18 || tzHour < 6) greeting = "Boa noite";
        
        let layer4 = `\n\n## CAMADA 4: CONTEXTO DINÂMICO E DADOS DA EMPRESA\nHorário atual: Utilize a saudação "${greeting}" quando for apropriado iniciar a conversa ou cumprimentar o cliente.`;

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
          layer4 += `\n\n### BASE DE CONHECIMENTO\nUse as informações abaixo para responder perguntas e passar valores corretos. Estas são fontes reais do negócio que prevalecem sobre todo conhecimento externo:\n\n${kbSections.join("\n\n---\n\n")}`;
        }

        systemPrompt = `${layer1}${layer2}${layer3}${layer4}`;
      }
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: activeModel,
        temperature: activeTemperature,
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
