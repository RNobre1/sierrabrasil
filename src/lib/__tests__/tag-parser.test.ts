import { describe, it, expect } from "vitest";
import { parseAiTags, cleanAiResponse } from "../tag-parser";

describe("parseAiTags", () => {
  it("parses [ESCALATE] tag", () => {
    const result = parseAiTags("Vou te transferir. [ESCALATE]");
    expect(result.escalate).toBe(true);
    expect(result.resolved).toBe(false);
  });

  it("parses [RESOLVED] tag", () => {
    const result = parseAiTags("Que bom que ajudei! [RESOLVED]");
    expect(result.resolved).toBe(true);
    expect(result.escalate).toBe(false);
  });

  it("parses [SENTIMENT: positivo]", () => {
    const result = parseAiTags("Que legal! [SENTIMENT: positivo]");
    expect(result.sentiment).toBe("positivo");
  });

  it("parses [SENTIMENT: negativo]", () => {
    const result = parseAiTags("Sinto muito. [SENTIMENT: negativo]");
    expect(result.sentiment).toBe("negativo");
  });

  it("parses [SENTIMENT: frustrado]", () => {
    const result = parseAiTags("Entendo sua frustracao. [SENTIMENT: frustrado]");
    expect(result.sentiment).toBe("frustrado");
  });

  it("parses [SENTIMENT: neutro]", () => {
    const result = parseAiTags("Certo, vou verificar. [SENTIMENT: neutro]");
    expect(result.sentiment).toBe("neutro");
  });

  it("parses [LEAD: nome=X | email=Y | telefone=Z]", () => {
    const result = parseAiTags("Anotei! [LEAD: nome=Maria | email=maria@email.com | telefone=11999999999]");
    expect(result.lead).toEqual({
      nome: "Maria",
      email: "maria@email.com",
      telefone: "11999999999",
    });
  });

  it("parses [LEAD:] with partial data", () => {
    const result = parseAiTags("Opa! [LEAD: nome=Joao | telefone=11888888888]");
    expect(result.lead).toEqual({
      nome: "Joao",
      telefone: "11888888888",
    });
    expect(result.lead!.email).toBeUndefined();
  });

  it("returns null lead when no LEAD tag", () => {
    const result = parseAiTags("Oi! Tudo bem?");
    expect(result.lead).toBeNull();
  });

  it("returns null sentiment when no SENTIMENT tag", () => {
    const result = parseAiTags("Oi! Tudo bem?");
    expect(result.sentiment).toBeNull();
  });

  it("parses multiple tags in same response", () => {
    const result = parseAiTags("Vou te transferir. [SENTIMENT: frustrado] [ESCALATE]");
    expect(result.escalate).toBe(true);
    expect(result.sentiment).toBe("frustrado");
  });

  it("handles case-insensitive sentiment values", () => {
    const result = parseAiTags("[SENTIMENT: Positivo]");
    expect(result.sentiment).toBe("positivo");
  });
});

describe("cleanAiResponse", () => {
  it("removes [ESCALATE] tag", () => {
    expect(cleanAiResponse("Vou transferir. [ESCALATE]")).toBe("Vou transferir.");
  });

  it("removes [RESOLVED] tag", () => {
    expect(cleanAiResponse("Que bom! [RESOLVED]")).toBe("Que bom!");
  });

  it("removes [SENTIMENT:...] tag", () => {
    expect(cleanAiResponse("Legal! [SENTIMENT: positivo]")).toBe("Legal!");
  });

  it("removes [LEAD:...] tag", () => {
    expect(cleanAiResponse("Anotei! [LEAD: nome=X | email=Y]")).toBe("Anotei!");
  });

  it("removes all tags at once", () => {
    const input = "Vou transferir. [SENTIMENT: frustrado] [LEAD: nome=X] [ESCALATE]";
    expect(cleanAiResponse(input)).toBe("Vou transferir.");
  });

  it("preserves text when no tags present", () => {
    expect(cleanAiResponse("Oi! Como posso ajudar?")).toBe("Oi! Como posso ajudar?");
  });

  it("handles empty string", () => {
    expect(cleanAiResponse("")).toBe("");
  });
});
