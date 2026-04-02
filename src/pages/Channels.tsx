import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Instagram, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import WhatsAppTab from "@/components/channels/WhatsAppTab";
import GuidedTour from "@/components/GuidedTour";
import { CHANNELS_STEPS, CHANNELS_TOUR_KEY } from "@/lib/tour-steps";

export default function Channels() {
  const { user } = useAuth();
  const [plan, setPlan] = useState("starter");

  useEffect(() => {
    if (!user) return;
    supabase.from("tenants").select("plan").eq("owner_id", user.id).single().then(({ data }) => {
      if (data) setPlan(data.plan);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Canais de Conexão</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie os canais de atendimento do seu agente</p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full" data-tour="channels-tabs">
        <TabsList className="bg-card border border-border/40 rounded-xl p-1 h-auto">
          <TabsTrigger value="whatsapp" className="gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4 py-2.5 text-sm">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2 rounded-lg data-[state=active]:bg-muted/80 data-[state=active]:text-muted-foreground px-4 py-2.5 text-sm opacity-60">
            <Instagram className="h-4 w-4" />
            Instagram
            <span className="text-[9px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-1">Em breve</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-6" data-tour="channels-whatsapp">
          <WhatsAppTab plan={plan} />
        </TabsContent>

        <TabsContent value="instagram" className="mt-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Instagram className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Instagram em breve</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Em breve você poderá conectar o Instagram Direct do seu negócio para o agente atender automaticamente.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <GuidedTour steps={CHANNELS_STEPS} tourKey={CHANNELS_TOUR_KEY} />
    </div>
  );
}
