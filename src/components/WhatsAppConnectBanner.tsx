import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppConnectBannerProps {
  isConnected: boolean;
  hasAgents?: boolean;
}

export default function WhatsAppConnectBanner({ isConnected, hasAgents = true }: WhatsAppConnectBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (isConnected || dismissed || !hasAgents) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200">
      <Wifi className="h-5 w-5 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-semibold">
          Nenhum numero WhatsApp conectado
        </p>
        <p className="text-xs text-amber-200/70 mt-0.5">
          Seus agentes nao podem receber mensagens sem um numero conectado.
        </p>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/channels")}
          className="border-amber-500/50 text-amber-300 hover:bg-amber-500/20 shrink-0 flex-1 sm:flex-initial"
        >
          Conectar WhatsApp
        </Button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar"
          className="text-amber-400/40 hover:text-amber-400/80 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
