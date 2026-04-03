import { describe, it, expect } from "vitest";
import { FALLBACK_LIMITS, getFallbackLimits, type PlanLimits } from "../plan-limits";

const PLAN_IDS = ["starter", "professional", "business", "enterprise"];
const REQUIRED_FIELDS: (keyof PlanLimits)[] = [
  "id",
  "display_name",
  "price_monthly",
  "max_agents",
  "max_conversations_month",
  "max_knowledge_docs",
  "max_knowledge_mb",
  "max_whatsapp_numbers",
  "features",
];

describe("FALLBACK_LIMITS", () => {
  it("has all 4 plans", () => {
    expect(Object.keys(FALLBACK_LIMITS)).toHaveLength(4);
    for (const id of PLAN_IDS) {
      expect(FALLBACK_LIMITS).toHaveProperty(id);
    }
  });

  it("each plan has all required fields", () => {
    for (const id of PLAN_IDS) {
      const plan = FALLBACK_LIMITS[id];
      for (const field of REQUIRED_FIELDS) {
        expect(plan).toHaveProperty(field);
      }
    }
  });

  it("starter has the lowest limits", () => {
    const starter = FALLBACK_LIMITS.starter;
    for (const id of PLAN_IDS) {
      if (id === "starter") continue;
      const other = FALLBACK_LIMITS[id];
      expect(starter.max_agents).toBeLessThanOrEqual(other.max_agents);
      expect(starter.max_conversations_month).toBeLessThanOrEqual(other.max_conversations_month);
      expect(starter.max_knowledge_docs).toBeLessThanOrEqual(other.max_knowledge_docs);
      expect(starter.max_knowledge_mb).toBeLessThanOrEqual(other.max_knowledge_mb);
      expect(starter.max_whatsapp_numbers).toBeLessThanOrEqual(other.max_whatsapp_numbers);
    }
  });

  it("enterprise has the highest limits", () => {
    const enterprise = FALLBACK_LIMITS.enterprise;
    for (const id of PLAN_IDS) {
      if (id === "enterprise") continue;
      const other = FALLBACK_LIMITS[id];
      expect(enterprise.max_agents).toBeGreaterThanOrEqual(other.max_agents);
      expect(enterprise.max_conversations_month).toBeGreaterThanOrEqual(other.max_conversations_month);
      expect(enterprise.max_knowledge_docs).toBeGreaterThanOrEqual(other.max_knowledge_docs);
      expect(enterprise.max_knowledge_mb).toBeGreaterThanOrEqual(other.max_knowledge_mb);
      expect(enterprise.max_whatsapp_numbers).toBeGreaterThanOrEqual(other.max_whatsapp_numbers);
    }
  });

  it("price is in BRL cents (starter = 9700 = R$97)", () => {
    expect(FALLBACK_LIMITS.starter.price_monthly).toBe(9700);
    expect(FALLBACK_LIMITS.professional.price_monthly).toBe(49700);
    expect(FALLBACK_LIMITS.business.price_monthly).toBe(99700);
  });

  it("enterprise price is null (custom pricing)", () => {
    expect(FALLBACK_LIMITS.enterprise.price_monthly).toBeNull();
  });

  it("starter does not have memory feature", () => {
    expect(FALLBACK_LIMITS.starter.features.memory).toBe(false);
  });

  it("professional, business, and enterprise have memory feature", () => {
    expect(FALLBACK_LIMITS.professional.features.memory).toBe(true);
    expect(FALLBACK_LIMITS.business.features.memory).toBe(true);
    expect(FALLBACK_LIMITS.enterprise.features.memory).toBe(true);
  });
});

describe("getFallbackLimits", () => {
  it("returns the correct plan for a known ID", () => {
    expect(getFallbackLimits("professional")).toEqual(FALLBACK_LIMITS.professional);
  });

  it("returns starter limits for an unknown plan ID", () => {
    expect(getFallbackLimits("nonexistent")).toEqual(FALLBACK_LIMITS.starter);
  });

  it("returns starter limits for empty string", () => {
    expect(getFallbackLimits("")).toEqual(FALLBACK_LIMITS.starter);
  });
});
