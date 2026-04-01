import { describe, it, expect } from "vitest";

// Extraido da edge function recommend-model/index.ts para teste
// Regra: modelos de agente sao apenas Claude e GPT. Gemini nao e opcao para agentes.
const SECTOR_RECOMMENDATIONS: Record<string, { primary: string; reason: string; alternatives: string[] }> = {
  "saude":       { primary: "anthropic/claude-sonnet-4-6", reason: "Humanizacao", alternatives: ["openai/gpt-4.1"] },
  "clinica":     { primary: "anthropic/claude-sonnet-4-6", reason: "Empatia", alternatives: ["openai/gpt-4.1"] },
  "juridico":    { primary: "anthropic/claude-sonnet-4-6", reason: "Precisao", alternatives: ["openai/gpt-4.1"] },
  "alimentacao": { primary: "openai/gpt-4.1-mini", reason: "Velocidade", alternatives: ["anthropic/claude-haiku-4-5"] },
  "restaurante": { primary: "openai/gpt-4.1-mini", reason: "Velocidade", alternatives: ["anthropic/claude-haiku-4-5"] },
  "delivery":    { primary: "openai/gpt-4.1-mini", reason: "Velocidade", alternatives: ["anthropic/claude-haiku-4-5"] },
  "imobiliario": { primary: "openai/gpt-4.1-mini", reason: "Dados", alternatives: ["anthropic/claude-sonnet-4-6"] },
  "fitness":     { primary: "anthropic/claude-haiku-4-5", reason: "Agendamento", alternatives: ["openai/gpt-4.1-mini"] },
  "academia":    { primary: "anthropic/claude-haiku-4-5", reason: "Agendamento", alternatives: ["openai/gpt-4.1-mini"] },
  "varejo":      { primary: "openai/gpt-4.1-mini", reason: "Catalogo", alternatives: ["anthropic/claude-haiku-4-5"] },
  "ecommerce":   { primary: "openai/gpt-4.1-mini", reason: "Catalogo", alternatives: ["anthropic/claude-haiku-4-5"] },
  "loja":        { primary: "openai/gpt-4.1-mini", reason: "Catalogo", alternatives: ["anthropic/claude-haiku-4-5"] },
  "educacao":    { primary: "anthropic/claude-sonnet-4-6", reason: "Didatica", alternatives: ["openai/gpt-4.1"] },
  "escola":      { primary: "anthropic/claude-sonnet-4-6", reason: "Didatica", alternatives: ["openai/gpt-4.1"] },
  "tecnologia":  { primary: "openai/gpt-4.1", reason: "Tecnico", alternatives: ["anthropic/claude-sonnet-4-6"] },
  "saas":        { primary: "openai/gpt-4.1", reason: "Tecnico", alternatives: ["anthropic/claude-sonnet-4-6"] },
  "servicos":    { primary: "openai/gpt-4.1-mini", reason: "Equilibrio", alternatives: ["anthropic/claude-haiku-4-5"] },
};

const DEFAULT_RECOMMENDATION = {
  primary: "openai/gpt-4.1-mini",
  reason: "Modelo padrao.",
  alternatives: ["anthropic/claude-haiku-4-5"],
};

const CLASS_ADJUSTMENTS: Record<string, { prefer: string }> = {
  "sales": { prefer: "openai/gpt-4.1-mini" },
  "support": { prefer: "anthropic/claude-sonnet-4-6" },
  "scheduling": { prefer: "anthropic/claude-haiku-4-5" },
  "education": { prefer: "anthropic/claude-sonnet-4-6" },
  "reception": { prefer: "openai/gpt-4.1-mini" },
};

function recommendModel(sector: string, agentClass?: string) {
  const normalized = (sector || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();

  let recommendation = DEFAULT_RECOMMENDATION;
  for (const [key, rec] of Object.entries(SECTOR_RECOMMENDATIONS)) {
    if (normalized.includes(key)) {
      recommendation = rec;
      break;
    }
  }

  if (recommendation === DEFAULT_RECOMMENDATION && agentClass && CLASS_ADJUSTMENTS[agentClass]) {
    recommendation = {
      ...DEFAULT_RECOMMENDATION,
      primary: CLASS_ADJUSTMENTS[agentClass].prefer,
    };
  }

  return { model: recommendation.primary, alternatives: recommendation.alternatives };
}

// Helper: verifica que nenhum modelo Gemini aparece nas recomendacoes
function isNonGemini(model: string) {
  return !model.startsWith("google/");
}

describe("recommendModel", () => {
  it("recomenda Claude para saude", () => {
    expect(recommendModel("saude").model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("recomenda Claude para clinica medica", () => {
    expect(recommendModel("clinica medica geral").model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("recomenda Claude para juridico", () => {
    expect(recommendModel("juridico").model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("recomenda GPT Mini para alimentacao (substituiu Gemini)", () => {
    expect(recommendModel("alimentacao").model).toBe("openai/gpt-4.1-mini");
  });

  it("recomenda GPT Mini para delivery (substituiu Gemini)", () => {
    expect(recommendModel("delivery de comida").model).toBe("openai/gpt-4.1-mini");
  });

  it("recomenda GPT para imobiliario", () => {
    expect(recommendModel("imobiliario").model).toBe("openai/gpt-4.1-mini");
  });

  it("recomenda GPT para varejo", () => {
    expect(recommendModel("varejo e comercio").model).toBe("openai/gpt-4.1-mini");
  });

  it("recomenda Claude Haiku para fitness (substituiu Gemini)", () => {
    expect(recommendModel("fitness e academia").model).toBe("anthropic/claude-haiku-4-5");
  });

  it("recomenda Claude para educacao", () => {
    expect(recommendModel("educacao e ensino").model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("recomenda GPT 4.1 para tecnologia", () => {
    expect(recommendModel("tecnologia e software").model).toBe("openai/gpt-4.1");
  });

  it("retorna default GPT Mini para setor desconhecido (substituiu Gemini)", () => {
    expect(recommendModel("setor inventado xyz").model).toBe("openai/gpt-4.1-mini");
  });

  it("usa agentClass como fallback quando setor e desconhecido", () => {
    expect(recommendModel("xyz", "support").model).toBe("anthropic/claude-sonnet-4-6");
    expect(recommendModel("xyz", "sales").model).toBe("openai/gpt-4.1-mini");
    expect(recommendModel("xyz", "scheduling").model).toBe("anthropic/claude-haiku-4-5");
  });

  it("prioriza setor sobre agentClass", () => {
    expect(recommendModel("saude", "sales").model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("normaliza acentos no setor", () => {
    expect(recommendModel("Saúde").model).toBe("anthropic/claude-sonnet-4-6");
    expect(recommendModel("JURÍDICO").model).toBe("anthropic/claude-sonnet-4-6");
    expect(recommendModel("Educação").model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("retorna alternativas", () => {
    const result = recommendModel("saude");
    expect(result.alternatives).toBeDefined();
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it("NUNCA recomenda Gemini como modelo de agente", () => {
    const allSectors = [
      "saude", "clinica", "juridico", "alimentacao", "restaurante",
      "delivery", "imobiliario", "fitness", "academia", "varejo",
      "ecommerce", "loja", "educacao", "escola", "tecnologia",
      "saas", "servicos", "setor desconhecido xyz",
    ];
    for (const sector of allSectors) {
      const result = recommendModel(sector);
      expect(isNonGemini(result.model)).toBe(true);
      result.alternatives.forEach(alt => expect(isNonGemini(alt)).toBe(true));
    }
  });

  it("NUNCA recomenda Gemini via class adjustment", () => {
    const allClasses = ["sales", "support", "scheduling", "education", "reception"];
    for (const cls of allClasses) {
      const result = recommendModel("xyz", cls);
      expect(isNonGemini(result.model)).toBe(true);
    }
  });
});
