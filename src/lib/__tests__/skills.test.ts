import { describe, it, expect } from "vitest";
import { buildSkillInstructions, SKILL_INSTRUCTION_MAP } from "../skills";

describe("SKILL_INSTRUCTION_MAP", () => {
  it("has instructions for all implementable skills", () => {
    const expected = [
      "greeting",
      "escalation",
      "lead-capture",
      "sentiment",
      "follow-up",
      "multi-language",
      "faq",
    ];
    for (const id of expected) {
      expect(SKILL_INSTRUCTION_MAP).toHaveProperty(id);
      expect(SKILL_INSTRUCTION_MAP[id]).toBeTruthy();
    }
  });

  it("does not have instructions for coming-soon skills", () => {
    const comingSoon = ["scheduling", "email-integration", "advanced-analytics", "custom-actions"];
    for (const id of comingSoon) {
      expect(SKILL_INSTRUCTION_MAP).not.toHaveProperty(id);
    }
  });
});

describe("buildSkillInstructions", () => {
  it("returns empty string when no skills are active", () => {
    expect(buildSkillInstructions([])).toBe("");
  });

  it("returns empty string for null/undefined input", () => {
    expect(buildSkillInstructions(null as unknown as string[])).toBe("");
    expect(buildSkillInstructions(undefined as unknown as string[])).toBe("");
  });

  it("returns empty string when skills have no matching instructions", () => {
    expect(buildSkillInstructions(["nonexistent-skill"])).toBe("");
    expect(buildSkillInstructions(["auto-reply"])).toBe("");
  });

  it("returns empty string for coming-soon skills only", () => {
    expect(buildSkillInstructions(["scheduling", "email-integration"])).toBe("");
  });

  // --- Multilíngue ---
  it("includes language detection instruction for multi-language", () => {
    const result = buildSkillInstructions(["multi-language"]);
    expect(result).toContain("HABILIDADES ATIVAS");
    expect(result).toMatch(/idioma/i);
    expect(result).toMatch(/portugu[eê]s|ingl[eê]s|espanhol/i);
  });

  // --- Greeting ---
  it("includes greeting instruction with default greeting", () => {
    const result = buildSkillInstructions(["greeting"]);
    expect(result).toContain("HABILIDADES ATIVAS");
    expect(result).toMatch(/saudac|personalizado|nome/i);
  });

  it("includes custom greeting when provided via context", () => {
    const result = buildSkillInstructions(["greeting"], { greeting: "Boa tarde" });
    expect(result).toContain("Boa tarde");
  });

  // --- Escalation ---
  it("includes escalation instruction", () => {
    const result = buildSkillInstructions(["escalation"]);
    expect(result).toMatch(/humano|transferir/i);
    expect(result).toMatch(/frustra/i);
  });

  // --- Lead Capture ---
  it("includes lead-capture instruction with structured tag", () => {
    const result = buildSkillInstructions(["lead-capture"]);
    expect(result).toMatch(/email/i);
    expect(result).toMatch(/telefone|phone/i);
    expect(result).toContain("[LEAD:");
  });

  // --- Sentiment ---
  it("includes sentiment instruction with tag", () => {
    const result = buildSkillInstructions(["sentiment"]);
    expect(result).toMatch(/sentimento|emoc|tom/i);
    expect(result).toContain("[SENTIMENT:");
  });

  // --- Follow-up ---
  it("includes follow-up instruction", () => {
    const result = buildSkillInstructions(["follow-up"]);
    expect(result).toMatch(/conversa anterior|retorn/i);
  });

  // --- FAQ ---
  it("includes faq instruction", () => {
    const result = buildSkillInstructions(["faq"]);
    expect(result).toMatch(/FAQ|pergunt/i);
  });

  // --- Combinações ---
  it("combines multiple skills as bullet list", () => {
    const result = buildSkillInstructions(
      ["greeting", "escalation", "multi-language"],
      { greeting: "Bom dia" },
    );
    expect(result).toContain("## HABILIDADES ATIVAS");
    expect(result).toContain("Bom dia");
    expect(result).toMatch(/humano|transferir/i);
    expect(result).toMatch(/idioma/i);
    // Check bullet format
    const bullets = result.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(3);
  });

  it("ignores unknown skills mixed with valid ones", () => {
    const result = buildSkillInstructions(["escalation", "nonexistent", "scheduling"]);
    const bullets = result.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(1); // only escalation
  });

  it("includes contact name in greeting when provided", () => {
    const result = buildSkillInstructions(["greeting"], {
      greeting: "Boa noite",
      contactName: "Maria",
    });
    expect(result).toContain("Maria");
  });
});
