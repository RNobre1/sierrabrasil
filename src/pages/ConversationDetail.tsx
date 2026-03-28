import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Clock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const mockMessages = [
  { role: "contact", content: "Olá, boa tarde! Gostaria de agendar um horário para amanhã.", time: "14:02" },
  { role: "attendant", content: "Olá Maria! Claro, temos horários disponíveis. Qual período prefere: manhã (9h-12h) ou tarde (14h-18h)?", time: "14:02" },
  { role: "contact", content: "Prefiro pela manhã, tem algo às 10h?", time: "14:03" },
  { role: "attendant", content: "Sim! Temos disponibilidade às 10h. Vou confirmar o agendamento:\n\n📅 Data: Amanhã\n⏰ Horário: 10:00\n📍 Local: Unidade Centro\n\nPosso confirmar?", time: "14:03" },
  { role: "contact", content: "Pode confirmar sim!", time: "14:04" },
  { role: "attendant", content: "Agendamento confirmado! ✅\n\nVocê receberá um lembrete 1h antes. Qualquer dúvida, é só me chamar. 😊", time: "14:04" },
  { role: "system", content: "Ação executada: agendamento_criado | ID: #AG-2847", time: "14:04" },
];

export default function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/conversations")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-display font-semibold">Maria Silva</h1>
            <Badge variant="secondary">Resolvida</Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> +55 11 99999-1234</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 12 min</span>
            <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Chat */}
      <Card className="p-4">
        <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
          {mockMessages.map((msg, i) => {
            if (msg.role === "system") {
              return (
                <div key={i} className="flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground font-mono">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isContact = msg.role === "contact";
            return (
              <div key={i} className={`flex ${isContact ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isContact
                    ? "bg-muted text-foreground rounded-bl-md"
                    : "bg-primary text-primary-foreground rounded-br-md"
                }`}>
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  <p className={`mt-1 text-[10px] ${isContact ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
