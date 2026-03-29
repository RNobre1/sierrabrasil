import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UpgradeGate({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center rounded-2xl bg-gradient-to-t from-background/90 via-background/40 to-transparent pb-8">
      <div className="text-center space-y-3 max-w-sm px-4">
        <div className="h-12 w-12 rounded-2xl bg-meteora-warning/10 flex items-center justify-center mx-auto border border-meteora-warning/20">
          <Lock className="h-5 w-5 text-meteora-warning" />
        </div>
        <p className="text-sm font-medium text-foreground">{message}</p>
        <Button className="gap-2 bg-gradient-to-r from-meteora-warning to-amber-500 text-white shadow-lg shadow-amber-500/20">
          Fazer Upgrade <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
