import { useState, useEffect } from "react";
import { Users, Mail, Phone, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneDisplay } from "@/lib/formatters";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface Lead {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: string;
  created_at: string;
}

interface Props {
  agentId: string;
}

export default function AgentLeadsPanel({ agentId }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, [agentId]);

  const loadLeads = async () => {
    const { data, error } = await supabase
      .from("agent_leads")
      .select("id, contact_name, contact_email, contact_phone, source, created_at")
      .eq("attendant_id", agentId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLeads(data);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Leads Capturados</h3>
        <Badge variant="outline" className="text-[9px] font-mono">
          {leads.length} lead{leads.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Dados de contato coletados automaticamente durante conversas pelo agente.
      </p>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : leads.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhum lead capturado ainda. O agente coletará dados automaticamente durante as conversas.
        </p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="p-3 rounded-lg border border-border/30 bg-card/50 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {lead.contact_name || "Sem nome"}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  {lead.contact_email && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Mail className="h-2.5 w-2.5" />
                      {lead.contact_email}
                    </span>
                  )}
                  {lead.contact_phone && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      {formatPhoneDisplay(lead.contact_phone)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground flex items-center gap-1 shrink-0">
                <Calendar className="h-2.5 w-2.5" />
                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
