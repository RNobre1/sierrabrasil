/**
 * Hooks for admin tenant impersonation.
 *
 * When an admin "enters" a tenant from the admin panel, the tenant ID is stored
 * in localStorage. Client pages can use these helpers to fetch data for the
 * impersonated tenant instead of the logged-in user's own tenant.
 */

const KEY_TENANT = "admin_impersonating_tenant";
const KEY_ADMIN = "admin_impersonating_by";
const KEY_SINCE = "admin_impersonating_since";

/** Returns the impersonated tenant ID, or null when not impersonating. */
export function useImpersonatedTenant(): string | null {
  return localStorage.getItem(KEY_TENANT);
}

/** True when the current session is impersonating a tenant. */
export function isImpersonating(): boolean {
  return !!localStorage.getItem(KEY_TENANT);
}

/** Start impersonation — stores all three keys. */
export function startImpersonation(tenantId: string, adminUserId: string): void {
  localStorage.setItem(KEY_TENANT, tenantId);
  localStorage.setItem(KEY_ADMIN, adminUserId);
  localStorage.setItem(KEY_SINCE, new Date().toISOString());
}

/** Stop impersonation — removes all three keys. */
export function stopImpersonation(): void {
  localStorage.removeItem(KEY_TENANT);
  localStorage.removeItem(KEY_ADMIN);
  localStorage.removeItem(KEY_SINCE);
}
