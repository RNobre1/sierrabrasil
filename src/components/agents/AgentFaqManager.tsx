import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  match_count: number;
}

interface Props {
  agentId: string;
  tenantId: string;
}

export default function AgentFaqManager({ agentId, tenantId }: Props) {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadFaqs();
  }, [agentId]);

  const loadFaqs = async () => {
    const { data, error } = await supabase
      .from("agent_faqs")
      .select("id, question, answer, is_active, match_count")
      .eq("attendant_id", agentId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFaqs(data);
    }
    setLoading(false);
  };

  const addFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setAdding(true);

    const { data, error } = await supabase
      .from("agent_faqs")
      .insert({
        attendant_id: agentId,
        tenant_id: tenantId,
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      })
      .select()
      .single();

    setAdding(false);
    if (error) {
      toast.error("Erro ao adicionar FAQ");
      return;
    }
    if (data) {
      setFaqs([data, ...faqs]);
      setNewQuestion("");
      setNewAnswer("");
      toast.success("FAQ adicionada");
    }
  };

  const deleteFaq = async (id: string) => {
    const { error } = await supabase.from("agent_faqs").delete().eq("id", id);
    if (!error) {
      setFaqs(faqs.filter((f) => f.id !== id));
      toast.success("FAQ removida");
    } else {
      toast.error("Erro ao remover FAQ");
    }
  };

  const toggleFaq = async (id: string) => {
    const faq = faqs.find((f) => f.id === id);
    if (!faq) return;
    const newActive = !faq.is_active;
    const { error } = await supabase.from("agent_faqs").update({ is_active: newActive }).eq("id", id);
    if (!error) {
      setFaqs(faqs.map((f) => (f.id === id ? { ...f, is_active: newActive } : f)));
    }
  };

  const canAdd = newQuestion.trim().length > 0 && newAnswer.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">FAQ Inteligente</h3>
        <Badge variant="outline" className="text-[9px] font-mono">
          {faqs.length} pergunta{faqs.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Perguntas frequentes com respostas prontas. Quando um cliente faz uma pergunta similar, o agente responde instantaneamente sem chamar a IA, economizando tokens.
      </p>

      {/* Add form */}
      <div className="space-y-2 p-3 rounded-lg border border-border/30 bg-muted/20">
        <Input
          placeholder="Pergunta (ex: Qual o horário de funcionamento?)"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          className="text-xs h-8"
        />
        <Textarea
          placeholder="Resposta (ex: Funcionamos de segunda a sexta, das 8h às 18h)"
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          className="text-xs min-h-[60px] resize-none"
        />
        <Button
          size="sm"
          onClick={addFaq}
          disabled={!canAdd || adding}
          className="gap-1.5 text-xs h-7"
        >
          <Plus className="h-3 w-3" />
          {adding ? "Adicionando..." : "Adicionar"}
        </Button>
      </div>

      {/* FAQ list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : faqs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhuma pergunta cadastrada ainda. Adicione sua primeira FAQ acima.
        </p>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className={`p-3 rounded-lg border transition-all ${
                faq.is_active
                  ? "border-border/30 bg-card/50"
                  : "border-border/20 bg-card/20 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{faq.question}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {faq.answer}
                  </p>
                  {faq.match_count > 0 && (
                    <span className="text-[9px] text-muted-foreground mt-1 inline-block">
                      {faq.match_count} match{faq.match_count !== 1 ? "es" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title={faq.is_active ? "Desativar" : "Ativar"}
                  >
                    {faq.is_active ? (
                      <ToggleRight className="h-4 w-4 text-primary" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteFaq(faq.id)}
                    className="p-1 hover:bg-destructive/10 rounded transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
