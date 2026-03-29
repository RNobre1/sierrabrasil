import { useEffect, useState } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialTimerProps {
  createdAt: string;
  trialDays?: number;
}

export default function TrialTimer({ createdAt, trialDays = 7 }: TrialTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const end = new Date(createdAt);
      end.setDate(end.getDate() + trialDays);
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
      });
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [createdAt, trialDays]);

  if (expired) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 flex items-center gap-3">
        <Clock className="h-4 w-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">Seu período de testes expirou</p>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-xs h-8">
          Fazer Upgrade <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-3.5 flex items-center gap-3">
      <Clock className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">
          Seu período de testes termina em{" "}
          <span className="text-primary font-bold">
            {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}min
          </span>
        </p>
      </div>
      <Button size="sm" className="shrink-0 gap-1.5 bg-gradient-to-r from-primary to-[hsl(var(--meteora-cyan))] text-white text-xs h-8 shadow-sm shadow-primary/20">
        Fazer Upgrade <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
