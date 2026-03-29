import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

export default function TextPasteModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState("");

  const handleConfirm = () => {
    if (text.trim()) {
      onConfirm(text.trim());
      setText("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setText(""); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Colar texto sobre sua empresa
          </DialogTitle>
          <DialogDescription>
            Cole aqui qualquer texto relevante: descrição da empresa, lista de produtos, tabela de preços, regras de atendimento, FAQ, etc.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole seu texto aqui..."
          className="min-h-[200px] resize-none bg-background border-border"
          autoFocus
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onClose(); setText(""); }}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!text.trim()}>
            Confirmar texto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
