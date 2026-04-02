import { describe, it, expect } from "vitest";
import { findFaqMatch, type FaqEntry } from "../faq-matcher";

const sampleFaqs: FaqEntry[] = [
  { id: "1", question: "Qual o horário de funcionamento?", answer: "Funcionamos de segunda a sexta, das 8h às 18h." },
  { id: "2", question: "Onde fica a loja?", answer: "Estamos na Rua Augusta, 1200, São Paulo." },
  { id: "3", question: "Vocês fazem entrega?", answer: "Sim! Entregamos em toda a região metropolitana." },
  { id: "4", question: "Quanto custa o frete?", answer: "O frete varia de R$10 a R$30 dependendo da região." },
  { id: "5", question: "Aceitam cartão de crédito?", answer: "Aceitamos todas as bandeiras: Visa, Master, Elo, Amex." },
];

describe("findFaqMatch", () => {
  it("returns null when FAQ list is empty", () => {
    expect(findFaqMatch("qualquer pergunta", [])).toBeNull();
  });

  it("returns null for null/undefined message", () => {
    expect(findFaqMatch(null as unknown as string, sampleFaqs)).toBeNull();
    expect(findFaqMatch("", sampleFaqs)).toBeNull();
  });

  it("matches exact question", () => {
    const result = findFaqMatch("Qual o horário de funcionamento?", sampleFaqs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
    expect(result!.answer).toContain("8h às 18h");
  });

  it("matches case-insensitive", () => {
    const result = findFaqMatch("qual o horário de funcionamento?", sampleFaqs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
  });

  it("matches without accents", () => {
    const result = findFaqMatch("qual o horario de funcionamento", sampleFaqs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
  });

  it("matches without punctuation", () => {
    const result = findFaqMatch("onde fica a loja", sampleFaqs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("2");
  });

  it("matches similar phrasing (keyword overlap)", () => {
    const result = findFaqMatch("horario de funcionamento qual é", sampleFaqs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
  });

  it("matches delivery question with different wording", () => {
    const result = findFaqMatch("voces entregam?", sampleFaqs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("3");
  });

  it("matches credit card question", () => {
    const result = findFaqMatch("aceita cartao de credito?", sampleFaqs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("5");
  });

  it("matches freight cost question", () => {
    const result = findFaqMatch("quanto é o frete?", sampleFaqs);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("4");
  });

  it("returns null for unrelated message", () => {
    const result = findFaqMatch("bom dia, tudo bem?", sampleFaqs);
    expect(result).toBeNull();
  });

  it("returns null for generic greeting", () => {
    const result = findFaqMatch("oi", sampleFaqs);
    expect(result).toBeNull();
  });

  it("returns the best match when multiple could apply", () => {
    const result = findFaqMatch("quanto custa a entrega?", sampleFaqs);
    expect(result).not.toBeNull();
    // Should match frete (id 4) since "custa" and "entrega/frete" are related
    expect(["3", "4"]).toContain(result!.id);
  });

  it("requires minimum similarity threshold", () => {
    // Very short message with only 1 common word should not match
    const result = findFaqMatch("sim", sampleFaqs);
    expect(result).toBeNull();
  });
});
