import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `## PAPEL
Você é o assistente de onboarding da plataforma Meteora. Seu objetivo é conduzir uma conversa natural e amigável para conhecer o negócio do cliente e, a partir disso, configurar o atendente virtual dele.

## COMO FUNCIONA
1. Cumprimente o cliente pelo nome (se fornecido) e explique brevemente que vocês vão bater um papo rápido para configurar o atendente IA dele.
2. Faça perguntas naturais e uma de cada vez sobre:
   - Qual o nome do negócio / empresa
   - Qual o setor (saúde, varejo, alimentação, serviços, etc.)
   - Quais produtos ou serviços oferece (com preços se possível)
   - Qual o horário de funcionamento
   - Qual o tom de atendimento ideal (formal, descontraído, técnico, etc.)
   - Regras especiais (ex: não dar desconto, sempre pedir CPF, etc.)
   - Quais canais usa (WhatsApp, Instagram, site)
   - Se quer dar um nome ao atendente virtual
3. Seja conversacional e breve. Não faça múltiplas perguntas de uma vez. 
4. Use emojis moderadamente para deixar a conversa leve.
5. Quando tiver informações suficientes (pelo menos nome do negócio, setor, serviços e tom), pergunte se o cliente quer ajustar algo ou se pode finalizar.
6. Quando o cliente confirmar, responda EXATAMENTE no formato abaixo na sua última mensagem (e SOMENTE quando o cliente confirmar):

\`\`\`json
{"ready": true, "config": {"attendant_name": "...", "persona": "...", "instructions": "...", "channels": ["whatsapp", "web"]}}
\`\`\`

O campo "instructions" deve ser um texto detalhado e bem formatado com TODAS as informações coletadas, organizado em seções como: SOBRE O NEGÓCIO, PRODUTOS/SERVIÇOS, HORÁRIOS, REGRAS DE ATENDIMENTO, etc.

O campo "persona" deve ser uma frase curta descrevendo o tom: "Simpática, profissional e direta" por exemplo.

## REGRAS
- NUNCA invente informações que o cliente não forneceu
- Seja breve em cada resposta (2-4 frases no máximo)
- Se o cliente enviar áudio transcrito, trate normalmente como texto
- Adapte-se ao nível de formalidade do cliente
- Quando finalizar, SEMPRE inclua o bloco JSON na mesma mensagem de confirmação
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemContent = userName 
      ? SYSTEM_PROMPT + `\n\nO nome do cliente é: ${userName}`
      : SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições. Aguarde alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
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
    console.error("onboarding-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
