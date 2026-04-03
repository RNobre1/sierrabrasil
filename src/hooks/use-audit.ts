import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isImpersonating } from "@/hooks/use-tenant";

/**
 * Hook to log edits made during admin impersonation sessions.
 * Only logs when the current session is impersonating a tenant.
 */
export function useAuditLog() {
  const { user } = useAuth();

  const logEdit = async (action: string, details: Record<string, unknown>) => {
    if (!isImpersonating() || !user) return;

    const tenantId = localStorage.getItem("admin_impersonating_tenant");
    if (!tenantId) return;

    await supabase.from("audit_logs").insert({
      admin_user_id: user.id,
      tenant_id: tenantId,
      action: `impersonation_edit_${action}`,
      details,
    });
  };

  return { logEdit };
}
