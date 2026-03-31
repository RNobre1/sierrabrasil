import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppConnectBannerProps {
  isConnected: boolean;
}

export default function WhatsAppConnectBanner({ isConnected }: WhatsAppConnectBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (isConnected || dismissed) return null;

  return (
    <div className="relative rounded-xl border border-cosmos-emerald/30 bg-gradient-to-r from-cosmos-emerald/5 to-cosmos-cyan/5 p-4 sm:p-5">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fechar"
        className="absolute top-3 right-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-cosmos-emerald/10 flex items-center justify-center shrink-0">
          <MessageSquare className="h-5 w-5 text-cosmos-emerald" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-display font-semibold text-foreground">
            Conecte seu WhatsApp
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Seu agente esta pronto! Conecte o WhatsApp pra ele comecar a atender seus clientes.
          </p>
          <Button
            size="sm"
            onClick={() => navigate("/channels")}
            className="mt-3 gap-1.5 bg-cosmos-emerald hover:bg-cosmos-emerald/90 text-white"
          >
            Conectar <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
