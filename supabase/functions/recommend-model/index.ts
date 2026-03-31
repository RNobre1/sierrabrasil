import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ModelRecommendation {
  model: string;
  reason: string;
  alternatives: string[];
}

// Model profiles with strengths and cost tiers
const MODEL_PROFILES: Record<string, { strengths: string[]; cost: "low" | "medium" | "high"; speed: "fast" | "medium" | "slow" }> = {
  "google/gemini-2.5-flash":       { strengths: ["speed", "cost", "volume", "multimodal"], cost: "low", speed: "fast" },
  "google/gemini-2.5-pro":         { strengths: ["reasoning", "multimodal", "context"], cost: "medium", speed: "medium" },
  "openai/gpt-4.1-mini":           { strengths: ["data", "structured", "versatile"], cost: "low", speed: "fast" },
  "openai/gpt-4.1":               { strengths: ["data", "reasoning", "structured", "versatile"], cost: "medium", speed: "medium" },
  "anthropic/claude-sonnet-4-6":   { strengths: ["humanization", "nuance", "instructions", "empathy"], cost: "medium", speed: "medium" },
  "anthropic/claude-haiku-4-5":    { strengths: ["speed", "cost", "humanization"], cost: "low", speed: "fast" },
};

// Sector to model mapping based on needs
const SECTOR_RECOMMENDATIONS: Record<string, { primary: string; reason: string; alternatives: string[] }> = {
  // Healthcare: needs empathy, precision, trust
  "saude":       { primary: "anthropic/claude-sonnet-4-6", reason: "Melhor humanizacao e empatia pra area da saude. Preciso com informacoes sensiveis.", alternatives: ["openai/gpt-4.1", "google/gemini-2.5-pro"] },
  "clinica":     { primary: "anthropic/claude-sonnet-4-6", reason: "Tom acolhedor e profissional pra pacientes. Respeita instrucoes complexas.", alternatives: ["openai/gpt-4.1", "google/gemini-2.5-pro"] },

  // Legal: needs precision, formal tone, trust
  "juridico":    { primary: "anthropic/claude-sonnet-4-6", reason: "Preciso e formal. Excelente em seguir instrucoes complexas sem inventar.", alternatives: ["openai/gpt-4.1", "google/gemini-2.5-pro"] },
  "advocacia":   { primary: "anthropic/claude-sonnet-4-6", reason: "Preciso e formal. Excelente em seguir instrucoes complexas sem inventar.", alternatives: ["openai/gpt-4.1", "google/gemini-2.5-pro"] },

  // Food/Delivery: needs speed, high volume, casual tone
  "alimentacao": { primary: "google/gemini-2.5-flash", reason: "Rapido e barato pra alto volume de pedidos. Ideal pra delivery.", alternatives: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4-5"] },
  "restaurante": { primary: "google/gemini-2.5-flash", reason: "Respostas instantaneas pra pedidos e cardapio. Custo baixo.", alternatives: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4-5"] },
  "delivery":    { primary: "google/gemini-2.5-flash", reason: "Velocidade e custo otimos pra volume alto de mensagens.", alternatives: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4-5"] },

  // Real Estate: needs persuasion, data handling
  "imobiliario": { primary: "openai/gpt-4.1-mini", reason: "Bom com dados estruturados (precos, metragens, enderecos). Custo-beneficio.", alternatives: ["anthropic/claude-sonnet-4-6", "google/gemini-2.5-flash"] },
  "imobiliaria": { primary: "openai/gpt-4.1-mini", reason: "Bom com dados estruturados (precos, metragens, enderecos). Custo-beneficio.", alternatives: ["anthropic/claude-sonnet-4-6", "google/gemini-2.5-flash"] },

  // Fitness: needs motivation, casual tone, scheduling
  "fitness":     { primary: "google/gemini-2.5-flash", reason: "Rapido e descontraido. Ideal pra agendamentos e motivacao.", alternatives: ["anthropic/claude-haiku-4-5", "openai/gpt-4.1-mini"] },
  "academia":    { primary: "google/gemini-2.5-flash", reason: "Rapido e descontraido. Ideal pra agendamentos e motivacao.", alternatives: ["anthropic/claude-haiku-4-5", "openai/gpt-4.1-mini"] },

  // E-commerce/Retail: needs sales skills, data
  "varejo":      { primary: "openai/gpt-4.1-mini", reason: "Versatil com catalogos e precos. Bom custo-beneficio pra vendas.", alternatives: ["google/gemini-2.5-flash", "anthropic/claude-sonnet-4-6"] },
  "ecommerce":   { primary: "openai/gpt-4.1-mini", reason: "Excelente com dados de produtos e precos. Rapido.", alternatives: ["google/gemini-2.5-flash", "anthropic/claude-sonnet-4-6"] },
  "loja":        { primary: "openai/gpt-4.1-mini", reason: "Versatil com catalogos e precos. Bom custo-beneficio pra vendas.", alternatives: ["google/gemini-2.5-flash", "anthropic/claude-sonnet-4-6"] },

  // Education: needs patience, clarity
  "educacao":    { primary: "anthropic/claude-sonnet-4-6", reason: "Paciencia e clareza excepcionais. Adapta linguagem ao aluno.", alternatives: ["openai/gpt-4.1", "google/gemini-2.5-pro"] },
  "escola":      { primary: "anthropic/claude-sonnet-4-6", reason: "Didatico e paciente. Excelente pra tirar duvidas.", alternatives: ["openai/gpt-4.1", "google/gemini-2.5-pro"] },

  // Technology/SaaS: needs versatility
  "tecnologia":  { primary: "openai/gpt-4.1", reason: "Versatil e preciso com termos tecnicos. Bom raciocinio.", alternatives: ["anthropic/claude-sonnet-4-6", "google/gemini-2.5-pro"] },
  "saas":        { primary: "openai/gpt-4.1", reason: "Versatil e preciso com termos tecnicos. Bom raciocinio.", alternatives: ["anthropic/claude-sonnet-4-6", "google/gemini-2.5-pro"] },

  // Services (generic): balanced
  "servicos":    { primary: "google/gemini-2.5-flash", reason: "Equilibrio entre velocidade e qualidade. Custo acessivel.", alternatives: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4-5"] },
};

// Default recommendation
const DEFAULT_RECOMMENDATION = {
  primary: "google/gemini-2.5-flash",
  reason: "Modelo rapido e acessivel. Bom pra comecar e validar. Voce pode trocar depois nas configuracoes.",
  alternatives: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4-5"],
};

// Also consider agent class
const CLASS_ADJUSTMENTS: Record<string, { prefer: string; reason: string }> = {
  "sales":      { prefer: "openai/gpt-4.1-mini", reason: "Bom com dados de vendas e CTA" },
  "support":    { prefer: "anthropic/claude-sonnet-4-6", reason: "Empatia e resolucao de problemas" },
  "scheduling": { prefer: "google/gemini-2.5-flash", reason: "Rapido pra agendamentos" },
  "education":  { prefer: "anthropic/claude-sonnet-4-6", reason: "Paciencia e didatica" },
  "reception":  { prefer: "google/gemini-2.5-flash", reason: "Rapido pra triagem inicial" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-model error:", e);
    return new Response(JSON.stringify({
      model: "google/gemini-2.5-flash",
      reason: "Modelo padrao recomendado.",
      alternatives: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4-5"],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
