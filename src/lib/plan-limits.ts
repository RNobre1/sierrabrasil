export interface PlanLimits {
  id: string;
  display_name: string;
  price_monthly: number | null;
  max_agents: number;
  max_conversations_month: number;
  max_knowledge_docs: number;
  max_knowledge_mb: number;
  max_whatsapp_numbers: number;
  features: Record<string, unknown>;
}

// Fallback limits if DB query fails
export const FALLBACK_LIMITS: Record<string, PlanLimits> = {
  starter: {
    id: "starter",
    display_name: "Essencial",
    price_monthly: 9700,
    max_agents: 1,
    max_conversations_month: 100,
    max_knowledge_docs: 10,
    max_knowledge_mb: 10,
    max_whatsapp_numbers: 1,
    features: { memory: false, channels: ["whatsapp"], reports: "semanal", support: "chat", skills_premium: false, skill_tiers: "base" },
  },
  professional: {
    id: "professional",
    display_name: "Profissional",
    price_monthly: 49700,
    max_agents: 3,
    max_conversations_month: 900,
    max_knowledge_docs: 50,
    max_knowledge_mb: 100,
    max_whatsapp_numbers: 3,
    features: { memory: true, channels: ["whatsapp", "instagram"], reports: "diario", support: "prioritario", skills_premium: true, skill_tiers: "avancado" },
  },
  business: {
    id: "business",
    display_name: "Empresarial",
    price_monthly: 99700,
    max_agents: 10,
    max_conversations_month: 1800,
    max_knowledge_docs: 200,
    max_knowledge_mb: 500,
    max_whatsapp_numbers: 10,
    features: { memory: true, channels: ["whatsapp", "instagram", "webchat"], reports: "tempo_real", support: "consultoria_mensal", skills_premium: true, skill_tiers: "premium", dashboard_realtime: true },
  },
  enterprise: {
    id: "enterprise",
    display_name: "Enterprise",
    price_monthly: null,
    max_agents: 100,
    max_conversations_month: 999999,
    max_knowledge_docs: 999999,
    max_knowledge_mb: 2048,
    max_whatsapp_numbers: 100,
    features: { memory: true, channels: ["whatsapp", "instagram", "webchat", "api"], reports: "tempo_real", support: "manager_dedicado", skills_premium: true, skill_tiers: "premium", dashboard_realtime: true, custom_support: true, sla_garantido: true, implementacao_personalizada: true },
  },
};

/**
 * Returns fallback limits for a given plan ID.
 * Returns starter limits if the plan ID is not recognized.
 */
export function getFallbackLimits(planId: string): PlanLimits {
  return FALLBACK_LIMITS[planId] ?? FALLBACK_LIMITS.starter;
}
