import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

interface ModelRecommendation {
  model: string;
  reason: string;
  alternatives: string[];
}

// Model profiles — apenas Claude e GPT como opcoes de agente
// Gemini e usado apenas internamente como decisor, nunca como modelo do agente
const MODEL_PROFILES: Record<string, { strengths: string[]; cost: "low" | "medium" | "high"; speed: "fast" | "medium" | "slow" }> = {
  "openai/gpt-4.1-mini":           { strengths: ["data", "structured", "versatile", "speed", "volume"], cost: "low", speed: "fast" },
  "openai/gpt-4.1":               { strengths: ["data", "reasoning", "structured", "versatile"], cost: "medium", speed: "medium" },
  "anthropic/claude-sonnet-4-6":   { strengths: ["humanization", "nuance", "instructions", "empathy"], cost: "medium", speed: "medium" },
  "anthropic/claude-haiku-4-5":    { strengths: ["speed", "cost", "humanization"], cost: "low", speed: "fast" },
};

// Sector to model mapping — somente Claude e GPT
const SECTOR_RECOMMENDATIONS: Record<string, { primary: string; reason: string; alternatives: string[] }> = {
  // Healthcare: needs empathy, precision, trust
  "saude":       { primary: "anthropic/claude-sonnet-4-6", reason: "Melhor humanizacao e empatia pra area da saude. Preciso com informacoes sensiveis.", alternatives: ["openai/gpt-4.1"] },
  "clinica":     { primary: "anthropic/claude-sonnet-4-6", reason: "Tom acolhedor e profissional pra pacientes. Respeita instrucoes complexas.", alternatives: ["openai/gpt-4.1"] },

  // Legal: needs precision, formal tone, trust
  "juridico":    { primary: "anthropic/claude-sonnet-4-6", reason: "Preciso e formal. Excelente em seguir instrucoes complexas sem inventar.", alternatives: ["openai/gpt-4.1"] },
  "advocacia":   { primary: "anthropic/claude-sonnet-4-6", reason: "Preciso e formal. Excelente em seguir instrucoes complexas sem inventar.", alternatives: ["openai/gpt-4.1"] },

  // Food/Delivery: needs speed, high volume, casual tone
  "alimentacao": { primary: "openai/gpt-4.1-mini", reason: "Rapido e acessivel pra alto volume de pedidos. Ideal pra delivery.", alternatives: ["anthropic/claude-haiku-4-5"] },
  "restaurante": { primary: "openai/gpt-4.1-mini", reason: "Respostas rapidas pra pedidos e cardapio. Custo-beneficio otimo.", alternatives: ["anthropic/claude-haiku-4-5"] },
  "delivery":    { primary: "openai/gpt-4.1-mini", reason: "Velocidade e custo otimos pra volume alto de mensagens.", alternatives: ["anthropic/claude-haiku-4-5"] },

  // Real Estate: needs persuasion, data handling
  "imobiliario": { primary: "openai/gpt-4.1-mini", reason: "Bom com dados estruturados (precos, metragens, enderecos). Custo-beneficio.", alternatives: ["anthropic/claude-sonnet-4-6"] },
  "imobiliaria": { primary: "openai/gpt-4.1-mini", reason: "Bom com dados estruturados (precos, metragens, enderecos). Custo-beneficio.", alternatives: ["anthropic/claude-sonnet-4-6"] },

  // Fitness: needs motivation, casual tone, scheduling
  "fitness":     { primary: "anthropic/claude-haiku-4-5", reason: "Rapido e humanizado. Ideal pra agendamentos e motivacao.", alternatives: ["openai/gpt-4.1-mini"] },
  "academia":    { primary: "anthropic/claude-haiku-4-5", reason: "Rapido e humanizado. Ideal pra agendamentos e motivacao.", alternatives: ["openai/gpt-4.1-mini"] },

  // E-commerce/Retail: needs sales skills, data
  "varejo":      { primary: "openai/gpt-4.1-mini", reason: "Versatil com catalogos e precos. Bom custo-beneficio pra vendas.", alternatives: ["anthropic/claude-haiku-4-5"] },
  "ecommerce":   { primary: "openai/gpt-4.1-mini", reason: "Excelente com dados de produtos e precos. Rapido.", alternatives: ["anthropic/claude-haiku-4-5"] },
  "loja":        { primary: "openai/gpt-4.1-mini", reason: "Versatil com catalogos e precos. Bom custo-beneficio pra vendas.", alternatives: ["anthropic/claude-haiku-4-5"] },

  // Education: needs patience, clarity
  "educacao":    { primary: "anthropic/claude-sonnet-4-6", reason: "Paciencia e clareza excepcionais. Adapta linguagem ao aluno.", alternatives: ["openai/gpt-4.1"] },
  "escola":      { primary: "anthropic/claude-sonnet-4-6", reason: "Didatico e paciente. Excelente pra tirar duvidas.", alternatives: ["openai/gpt-4.1"] },

  // Technology/SaaS: needs versatility
  "tecnologia":  { primary: "openai/gpt-4.1", reason: "Versatil e preciso com termos tecnicos. Bom raciocinio.", alternatives: ["anthropic/claude-sonnet-4-6"] },
  "saas":        { primary: "openai/gpt-4.1", reason: "Versatil e preciso com termos tecnicos. Bom raciocinio.", alternatives: ["anthropic/claude-sonnet-4-6"] },

  // Services (generic): balanced
  "servicos":    { primary: "openai/gpt-4.1-mini", reason: "Equilibrio entre velocidade e qualidade. Custo acessivel.", alternatives: ["anthropic/claude-haiku-4-5"] },
};

// Default recommendation — GPT Mini como padrao (rapido, barato, versatil)
const DEFAULT_RECOMMENDATION = {
  primary: "openai/gpt-4.1-mini",
  reason: "Modelo rapido e acessivel. Bom pra comecar e validar. Voce pode trocar depois nas configuracoes.",
  alternatives: ["anthropic/claude-haiku-4-5"],
};

// Agent class adjustments — somente Claude e GPT
const CLASS_ADJUSTMENTS: Record<string, { prefer: string; reason: string }> = {
  "sales":      { prefer: "openai/gpt-4.1-mini", reason: "Bom com dados de vendas e CTA" },
  "support":    { prefer: "anthropic/claude-sonnet-4-6", reason: "Empatia e resolucao de problemas" },
  "scheduling": { prefer: "anthropic/claude-haiku-4-5", reason: "Rapido e humanizado pra agendamentos" },
  "education":  { prefer: "anthropic/claude-sonnet-4-6", reason: "Paciencia e didatica" },
  "reception":  { prefer: "openai/gpt-4.1-mini", reason: "Rapido pra triagem inicial" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const { sector, agentClass, plan } = await req.json();

    // Normalize sector to lowercase, remove accents
    const normalizedSector = (sector || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .trim();

    // Find best match in sector recommendations
    let recommendation = DEFAULT_RECOMMENDATION;
    for (const [key, rec] of Object.entries(SECTOR_RECOMMENDATIONS)) {
      if (normalizedSector.includes(key)) {
        recommendation = rec;
        break;
      }
    }

    // Apply class adjustment if sector didn't give a strong signal
    if (recommendation === DEFAULT_RECOMMENDATION && agentClass && CLASS_ADJUSTMENTS[agentClass]) {
      const adj = CLASS_ADJUSTMENTS[agentClass];
      recommendation = {
        primary: adj.prefer,
        reason: adj.reason,
        alternatives: DEFAULT_RECOMMENDATION.alternatives.filter(m => m !== adj.prefer),
      };
    }

    const result: ModelRecommendation = {
      model: recommendation.primary,
      reason: recommendation.reason,
      alternatives: recommendation.alternatives,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-model error:", e);
    return new Response(JSON.stringify({
      model: "openai/gpt-4.1-mini",
      reason: "Modelo padrao recomendado.",
      alternatives: ["anthropic/claude-haiku-4-5"],
    }), {
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
