import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isImpersonating, stopImpersonation, useImpersonatedTenant } from "@/hooks/use-tenant";

export default function AdminBanner() {
  const tenantId = useImpersonatedTenant();
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single()
      .then(({ data }) => setTenantName(data?.name || ""));
  }, [tenantId]);

  if (!isImpersonating()) return null;

  const exitImpersonation = () => {
    stopImpersonation();
    window.location.href = "/admin/tenants";
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        <span>
          Modo Administrador — Visualizando:{" "}
          <strong>{tenantName || "..."}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={exitImpersonation}
        className="h-7 text-xs border-amber-700 text-amber-900 hover:bg-amber-400 bg-amber-400/50"
      >
        Sair do modo admin
      </Button>
    </div>
  );
}
