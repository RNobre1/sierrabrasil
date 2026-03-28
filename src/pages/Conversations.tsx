import { useEffect, useState } from "react";
import { Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type ConversationStatus = "all" | "active" | "resolved" | "escalated";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Ativa", variant: "default" },
  resolved: { label: "Resolvida", variant: "secondary" },
  escalated: { label: "Escalada", variant: "destructive" },
};

interface ConversationRow {
  id: string;
  contact_name: string;
  contact_phone: string | null;
  channel: string;
  status: string;
  started_at: string;
  last_message?: string;
}

export default function Conversations() {
  const [filter, setFilter] = useState<ConversationStatus>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!tenant) { setLoading(false); return; }

      const { data } = await supabase
        .from("conversations")
        .select("id, contact_name, contact_phone, channel, status, started_at")
        .eq("tenant_id", tenant.id)
        .order("started_at", { ascending: false });

      if (data) {
        // Fetch last message for each conversation
        const withMessages = await Promise.all(
          data.map(async (conv) => {
            const { data: msgs } = await supabase
              .from("messages")
              .select("content")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1);
            return { ...conv, last_message: msgs?.[0]?.content ?? "" };
          })
        );
        setConversations(withMessages);
      }
      setLoading(false);
    };

    fetchConversations();
  }, [user]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const filtered = conversations.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.contact_name.toLowerCase().includes(q) && !(c.contact_phone ?? "").includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold">Conversas</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe todas as interações do seu atendente</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(["all", "active", "resolved", "escalated"] as ConversationStatus[]).map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
              {s === "all" ? "Todas" : statusConfig[s]?.label || s}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou telefone..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Conversation List */}
      <div className="space-y-2">
        {filtered.map((c) => (
          <Card
            key={c.id}
            className="cursor-pointer p-4 hover:bg-accent/50 transition-colors"
            onClick={() => navigate(`/conversations/${c.id}`)}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {c.contact_name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.contact_name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{c.channel}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.last_message}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={statusConfig[c.status]?.variant || "default"}>
                  {statusConfig[c.status]?.label || c.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(c.started_at)}</span>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
