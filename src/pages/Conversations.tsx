import { useState } from "react";
import { Search, Filter, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

type ConversationStatus = "all" | "active" | "resolved" | "escalated";

const mockConversations = [
  { id: "1", name: "Maria Silva", phone: "+55 11 99999-1234", lastMessage: "Obrigada! Agendamento confirmado para amanhã.", status: "resolved", channel: "whatsapp", time: "2 min" },
  { id: "2", name: "João Santos", phone: "+55 11 98888-5678", lastMessage: "Qual o prazo de entrega do produto X?", status: "active", channel: "whatsapp", time: "5 min" },
  { id: "3", name: "Ana Costa", phone: "+55 21 97777-9012", lastMessage: "Preciso falar com um atendente humano", status: "escalated", channel: "instagram", time: "12 min" },
  { id: "4", name: "Pedro Oliveira", phone: "+55 31 96666-3456", lastMessage: "Pedido #5678 — aguardando pagamento", status: "active", channel: "whatsapp", time: "18 min" },
  { id: "5", name: "Lucia Ferreira", phone: "+55 41 95555-7890", lastMessage: "Pode me enviar o cardápio atualizado?", status: "resolved", channel: "whatsapp", time: "25 min" },
  { id: "6", name: "Carlos Mendes", phone: "+55 51 94444-2345", lastMessage: "Horário de funcionamento?", status: "resolved", channel: "whatsapp", time: "1h" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Ativa", variant: "default" },
  resolved: { label: "Resolvida", variant: "secondary" },
  escalated: { label: "Escalada", variant: "destructive" },
};

export default function Conversations() {
  const [filter, setFilter] = useState<ConversationStatus>("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = mockConversations.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    return true;
  });

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
                    {c.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">{c.channel}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant={statusConfig[c.status]?.variant || "default"}>
                  {statusConfig[c.status]?.label || c.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{c.time}</span>
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
