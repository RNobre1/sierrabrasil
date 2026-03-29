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
   - Tom de atendimento ideal (formal, descontraído, técnico, etc.)
   - Se quer dar um nome ao atendente virtual

3. **REDES SOCIAIS (OBRIGATÓRIO)**: Após coletar o nome do negócio e setor (geralmente na 3ª ou 4ª mensagem do cliente), OBRIGATORIAMENTE inclua na sua resposta o marcador especial abaixo para acionar a tela de seleção de redes sociais:

\`\`\`social_links\`\`\`

Inclua esse marcador JUNTO com uma frase como: "Agora vamos ver onde sua empresa marca presença online!"

4. Seja conversacional e breve. Não faça múltiplas perguntas de uma vez.
5. Use emojis moderadamente para deixar a conversa leve.
6. Se o cliente enviar áudio transcrito (marcado com 🎤), trate normalmente como texto.
7. Se o cliente enviar conteúdo de documento (marcado com 📎), analise e incorpore as informações ao contexto.

## REGRAS
- NUNCA invente informações que o cliente não forneceu
- Seja breve em cada resposta (2-4 frases no máximo)
- Adapte-se ao nível de formalidade do cliente
- O marcador \`\`\`social_links\`\`\` deve aparecer EXATAMENTE UMA VEZ, quando for hora de pedir as redes
- Após o cliente informar as redes, ele será redirecionado para uma tela de scraping e overview. Você não precisa se preocupar com isso.
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
        model: "google/gemini-2.5-flash",
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
