import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlanLimits, getFallbackLimits } from "@/lib/plan-limits";

/**
 * Fetches plan limits from the `plans` table for a given plan ID.
 * Falls back to FALLBACK_LIMITS if the DB query fails.
 */
export function usePlanLimits(planId: string | null): { limits: PlanLimits; loading: boolean } {
  const effectivePlan = planId ?? "starter";
  const [limits, setLimits] = useState<PlanLimits>(getFallbackLimits(effectivePlan));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("plans")
          .select("id, display_name, price_monthly, max_agents, max_conversations_month, max_knowledge_docs, max_knowledge_mb, max_whatsapp_numbers, features")
          .eq("id", effectivePlan)
          .single();

        if (!cancelled) {
          if (error || !data) {
            setLimits(getFallbackLimits(effectivePlan));
          } else {
            setLimits({
              id: data.id,
              display_name: data.display_name,
              price_monthly: data.price_monthly,
              max_agents: data.max_agents,
              max_conversations_month: data.max_conversations_month,
              max_knowledge_docs: data.max_knowledge_docs,
              max_knowledge_mb: data.max_knowledge_mb,
              max_whatsapp_numbers: data.max_whatsapp_numbers,
              features: (data.features as Record<string, unknown>) ?? {},
            });
          }
        }
      } catch {
        if (!cancelled) {
          setLimits(getFallbackLimits(effectivePlan));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [effectivePlan]);

  return { limits, loading };
}
