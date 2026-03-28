import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

export default function Placeholder() {
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Construction className="h-12 w-12 mb-4" />
      <h2 className="text-lg font-display font-semibold text-foreground">Em construção</h2>
      <p className="text-sm mt-1">A página <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{pathname}</code> será implementada em breve.</p>
    </div>
  );
}
