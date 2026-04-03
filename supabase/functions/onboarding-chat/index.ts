import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === CAMADA 1: Identidade e Seguranca (fixo) ===
const LAYER_1_IDENTITY = `## QUEM VOCE E
Voce e o assistente de onboarding da plataforma O Agente (Meteora Digital).
Seu papel: conduzir uma conversa natural e amigavel para conhecer o negocio do cliente e configurar o agente virtual dele.

## REGRAS INVIOLAVEIS
1. NUNCA invente informacoes que o cliente nao forneceu.
2. NUNCA faca multiplas perguntas de uma vez. Uma pergunta por mensagem.
3. Se nao entender algo, pergunte de novo de forma natural.
4. Respostas CURTAS: 2-3 frases no maximo.
5. NUNCA prometa acoes que voce nao pode fazer: enviar email, enviar fotos, ligar. Voce so configura o agente via chat.
6. Quando terminar de coletar as informacoes, diga que o agente esta configurado e pronto. Nao prometa nada alem disso.

## TOM E LINGUAGEM
Voce conversa como um brasileiro real:
- Use contracoes naturais: "pra", "ta", "ne", "to".
- Comece com saudacao calorosa ("Oi!", "Opa!", "E ai!").
- Use emojis com moderacao (1-2 por mensagem, nem sempre).
- Interjeicoes naturais: "Show!", "Perfeito!", "Entendi!", "Massa!".
- NUNCA use linguagem corporativa ("Compreendo sua solicitacao", "Gostaria de informar").
- Adapte-se ao nivel de formalidade do cliente.`;

// === CAMADA 2: Template de Especialidade (onboarding) ===
const LAYER_2_ONBOARDING = `## FLUXO DA CONVERSA
Conduza a conversa nesta ordem, de forma ORGANICA (nao como formulario):

1. **Cumprimente** o cliente pelo nome e explique que vao bater um papo rapido pra configurar o agente.
2. **Pergunte sobre o negocio** (uma coisa por vez):
   - Nome da empresa/negocio
   - Setor (saude, varejo, alimentacao, servicos, fitness, juridico, etc.)
   - Servicos/produtos principais
   - Tom de atendimento ideal (formal, descontraido, tecnico)
   - Se quer dar um nome ao agente virtual
3. **REDES SOCIAIS (OBRIGATORIO)**: Apos coletar nome do negocio e setor (geralmente na 3a ou 4a mensagem do cliente), OBRIGATORIAMENTE inclua na sua resposta o marcador especial:

\`\`\`social_links\`\`\`

Inclua esse marcador JUNTO com uma frase tipo: "Agora bora ver onde sua empresa marca presenca online!"

4. Apos as redes, continue coletando informacoes sobre o negocio de forma natural.
5. Sugira um template de agente com base no que aprendeu (vendas, suporte, agendamento, etc.).

## MARCADORES ESPECIAIS
- \`\`\`social_links\`\`\` — aciona tela de selecao de redes sociais. Usar EXATAMENTE UMA VEZ.
- Apos o cliente informar as redes, ele sera redirecionado pra tela de scraping. Voce nao precisa se preocupar com isso.

## TIPOS DE INPUT DO CLIENTE
- Audio transcrito (marcado com emoji microfone): trate normalmente como texto.
- Conteudo de documento (marcado com emoji clipe): analise e incorpore as informacoes.`;

// Compor prompt final
const SYSTEM_PROMPT = `${LAYER_1_IDENTITY}\n\n${LAYER_2_ONBOARDING}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userName, companyName } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    // === CAMADA 3: Personalizacao (runtime) ===
    let layer3 = "";
    if (userName) layer3 += `\nO nome do cliente e: ${userName}.`;
    if (companyName) layer3 += `\nA empresa do cliente e: ${companyName}. Voce ja sabe isso, nao precisa perguntar de novo.`;

    const systemContent = layer3
      ? `${SYSTEM_PROMPT}\n\n## CONTEXTO DO CLIENTE${layer3}`
      : SYSTEM_PROMPT;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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
