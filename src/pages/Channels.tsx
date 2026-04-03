import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonatedTenant } from "@/hooks/use-tenant";
import WhatsAppTab from "@/components/channels/WhatsAppTab";
import GuidedTour from "@/components/GuidedTour";
import { CHANNELS_STEPS, CHANNELS_TOUR_KEY } from "@/lib/tour-steps";

export default function Channels() {
  const { user } = useAuth();
  const impersonatedTenant = useImpersonatedTenant();
  const [plan, setPlan] = useState("starter");

  useEffect(() => {
    if (!user) return;
    const query = impersonatedTenant
      ? supabase.from("tenants").select("plan").eq("id", impersonatedTenant).single()
      : supabase.from("tenants").select("plan").eq("owner_id", user.id).single();
    query.then(({ data }) => {
      if (data) setPlan(data.plan);
    });
  }, [user, impersonatedTenant]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie os números conectados ao seu agente</p>
      </div>

      <div data-tour="channels-whatsapp">
        <WhatsAppTab plan={plan} />
      </div>

      <GuidedTour steps={CHANNELS_STEPS} tourKey={CHANNELS_TOUR_KEY} />
    </div>
  );
}
