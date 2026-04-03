import { describe, it, expect } from "vitest";

// Logica extraida do onboarding-chat/index.ts

const LAYER_1_IDENTITY = `## QUEM VOCE E
Voce e o assistente de onboarding da plataforma O Agente (Meteora Digital).`;

const LAYER_2_ONBOARDING = `## FLUXO DA CONVERSA
Conduza a conversa nesta ordem, de forma ORGANICA.`;

const SYSTEM_PROMPT = `${LAYER_1_IDENTITY}\n\n${LAYER_2_ONBOARDING}`;

function buildOnboardingPrompt(userName?: string, companyName?: string): string {
  let layer3 = "";
  if (userName) layer3 += `\nO nome do cliente e: ${userName}.`;
  if (companyName) layer3 += `\nA empresa do cliente e: ${companyName}. Voce ja sabe isso, nao precisa perguntar de novo.`;

  return layer3
    ? `${SYSTEM_PROMPT}\n\n## CONTEXTO DO CLIENTE${layer3}`
    : SYSTEM_PROMPT;
}

describe("buildOnboardingPrompt", () => {
  it("retorna prompt base sem contexto quando nao tem dados do usuario", () => {
    const prompt = buildOnboardingPrompt();
    expect(prompt).toBe(SYSTEM_PROMPT);
    expect(prompt).not.toContain("CONTEXTO DO CLIENTE");
  });

  it("inclui nome do usuario quando fornecido", () => {
    const prompt = buildOnboardingPrompt("Rafael");
    expect(prompt).toContain("CONTEXTO DO CLIENTE");
    expect(prompt).toContain("O nome do cliente e: Rafael.");
  });

  it("inclui nome da empresa quando fornecido", () => {
    const prompt = buildOnboardingPrompt(undefined, "Meteora Digital");
    expect(prompt).toContain("A empresa do cliente e: Meteora Digital.");
    expect(prompt).toContain("nao precisa perguntar de novo");
  });

  it("inclui ambos quando fornecidos", () => {
    const prompt = buildOnboardingPrompt("Rafael", "Meteora");
    expect(prompt).toContain("O nome do cliente e: Rafael.");
    expect(prompt).toContain("A empresa do cliente e: Meteora.");
  });

  it("contem camada 1 (identidade)", () => {
    const prompt = buildOnboardingPrompt();
    expect(prompt).toContain("QUEM VOCE E");
    expect(prompt).toContain("O Agente");
  });

  it("contem camada 2 (fluxo de onboarding)", () => {
    const prompt = buildOnboardingPrompt();
    expect(prompt).toContain("FLUXO DA CONVERSA");
    expect(prompt).toContain("ORGANICA");
  });
});
