import { describe, it, expect } from "vitest";

// Extraido da edge function recommend-model/index.ts para teste
const SECTOR_RECOMMENDATIONS: Record<string, { primary: string; reason: string; alternatives: string[] }> = {
  "saude":       { primary: "anthropic/claude-sonnet-4-6", reason: "Humanizacao", alternatives: ["openai/gpt-4.1"] },
  "clinica":     { primary: "anthropic/claude-sonnet-4-6", reason: "Empatia", alternatives: ["openai/gpt-4.1"] },
  "juridico":    { primary: "anthropic/claude-sonnet-4-6", reason: "Precisao", alternatives: ["openai/gpt-4.1"] },
  "alimentacao": { primary: "google/gemini-2.5-flash", reason: "Velocidade", alternatives: ["openai/gpt-4.1-mini"] },
  "restaurante": { primary: "google/gemini-2.5-flash", reason: "Velocidade", alternatives: ["openai/gpt-4.1-mini"] },
  "delivery":    { primary: "google/gemini-2.5-flash", reason: "Velocidade", alternatives: ["openai/gpt-4.1-mini"] },
  "imobiliario": { primary: "openai/gpt-4.1-mini", reason: "Dados", alternatives: ["anthropic/claude-sonnet-4-6"] },
  "fitness":     { primary: "google/gemini-2.5-flash", reason: "Agendamento", alternatives: ["anthropic/claude-haiku-4-5"] },
  "varejo":      { primary: "openai/gpt-4.1-mini", reason: "Catalogo", alternatives: ["google/gemini-2.5-flash"] },
  "educacao":    { primary: "anthropic/claude-sonnet-4-6", reason: "Didatica", alternatives: ["openai/gpt-4.1"] },
  "tecnologia":  { primary: "openai/gpt-4.1", reason: "Tecnico", alternatives: ["anthropic/claude-sonnet-4-6"] },
  "servicos":    { primary: "google/gemini-2.5-flash", reason: "Equilibrio", alternatives: ["openai/gpt-4.1-mini"] },
};

const DEFAULT_RECOMMENDATION = {
  primary: "google/gemini-2.5-flash",
  reason: "Modelo padrao.",
  alternatives: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4-5"],
};

const CLASS_ADJUSTMENTS: Record<string, { prefer: string }> = {
  "sales": { prefer: "openai/gpt-4.1-mini" },
  "support": { prefer: "anthropic/claude-sonnet-4-6" },
  "scheduling": { prefer: "google/gemini-2.5-flash" },
  "education": { prefer: "anthropic/claude-sonnet-4-6" },
  "reception": { prefer: "google/gemini-2.5-flash" },
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

  it("recomenda Gemini Flash para alimentacao", () => {
    expect(recommendModel("alimentacao").model).toBe("google/gemini-2.5-flash");
  });

  it("recomenda Gemini Flash para delivery", () => {
    expect(recommendModel("delivery de comida").model).toBe("google/gemini-2.5-flash");
  });

  it("recomenda GPT para imobiliario", () => {
    expect(recommendModel("imobiliario").model).toBe("openai/gpt-4.1-mini");
  });

  it("recomenda GPT para varejo", () => {
    expect(recommendModel("varejo e comercio").model).toBe("openai/gpt-4.1-mini");
  });

  it("recomenda Gemini Flash para fitness", () => {
    expect(recommendModel("fitness e academia").model).toBe("google/gemini-2.5-flash");
  });

  it("recomenda Claude para educacao", () => {
    expect(recommendModel("educacao e ensino").model).toBe("anthropic/claude-sonnet-4-6");
  });

  it("recomenda GPT 4.1 para tecnologia", () => {
    expect(recommendModel("tecnologia e software").model).toBe("openai/gpt-4.1");
  });

  it("retorna default para setor desconhecido", () => {
    expect(recommendModel("setor inventado xyz").model).toBe("google/gemini-2.5-flash");
  });

  it("usa agentClass como fallback quando setor e desconhecido", () => {
    expect(recommendModel("xyz", "support").model).toBe("anthropic/claude-sonnet-4-6");
    expect(recommendModel("xyz", "sales").model).toBe("openai/gpt-4.1-mini");
    expect(recommendModel("xyz", "scheduling").model).toBe("google/gemini-2.5-flash");
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
});
