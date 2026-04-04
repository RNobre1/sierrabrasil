import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isImpersonating, stopImpersonation, useImpersonatedTenant } from "@/hooks/use-tenant";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminBanner() {
  const { user } = useAuth();
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

  const exitImpersonation = async () => {
    if (tenantId && user) {
      // Log end of session
      await supabase.from("audit_logs").insert({
        admin_user_id: user.id,
        tenant_id: tenantId,
        action: "impersonation_end",
        details: {},
      });

      // Invalidate the approval so next access requires new approval
      // Mark all approved notifications for this admin+tenant as "used"
      const { data: approvals } = await supabase
        .from("notifications")
        .select("id, action_data")
        .eq("type", "admin_access_request")
        .eq("action_result", "approved");

      if (approvals) {
        for (const n of approvals) {
          const ad = n.action_data as Record<string, string> | null;
          if (ad?.admin_user_id === user.id && ad?.tenant_id === tenantId) {
            await supabase.from("notifications").update({
              action_result: "used",
            }).eq("id", n.id);
          }
        }
      }
    }
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
