import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import WhatsAppTab from "@/components/channels/WhatsAppTab";
import InstagramTab from "@/components/channels/InstagramTab";
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
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas integrações com WhatsApp e Instagram</p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full" data-tour="channels-tabs">
        <TabsList className="bg-card border border-border/40 rounded-xl p-1 h-auto">
          <TabsTrigger value="whatsapp" className="gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4 py-2.5 text-sm">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-4 py-2.5 text-sm">
            <Instagram className="h-4 w-4" />
            Instagram
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-6" data-tour="channels-whatsapp">
          <WhatsAppTab plan={plan} />
        </TabsContent>

        <TabsContent value="instagram" className="mt-6">
          <InstagramTab />
        </TabsContent>
      </Tabs>

      <GuidedTour steps={CHANNELS_STEPS} tourKey={CHANNELS_TOUR_KEY} />
    </div>
  );
}
