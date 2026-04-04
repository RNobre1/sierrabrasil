import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageSquare, Bot, BarChart3, Radio, Puzzle, Zap, Crown, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { isImpersonating, useImpersonatedTenant } from "@/hooks/use-tenant";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import AdminBanner from "@/components/AdminBanner";
import meteoraLogoBranca from "@/assets/meteora-branca.png";
import meteoraLogoPreta from "@/assets/meteora-preta.png";
import { MeteoraSeal } from "@/components/MeteoraBrand";

interface SubItem {
  to: string;
  label: string;
  comingSoon?: boolean;
  disabled?: boolean;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  expandKey?: string;
  subItems?: SubItem[];
  comingSoon?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Principal",
    items: [
      { to: "/dashboard", icon: Home, label: "Início" },
      { to: "/conversations", icon: MessageSquare, label: "Conversas" },
    ],
  },
  {
    label: "Agentes",
    items: [
      { to: "/agents", icon: Bot, label: "Agentes" },
    ],
  },
  {
    label: "Canais",
    items: [
      {
        to: "/channels",
        icon: Radio,
        label: "Canais",
        expandKey: "channels",
        subItems: [
          { to: "/channels", label: "WhatsApp" },
          { to: "/channels?tab=instagram", label: "Instagram", comingSoon: true },
        ],
      },
    ],
  },
  {
    label: "Análise",
    items: [
      {
        to: "/reports",
        icon: BarChart3,
        label: "Relatórios",
        expandKey: "reports",
        comingSoon: true,
        subItems: [
          { to: "/reports", label: "Vendas", comingSoon: true, disabled: true },
          { to: "/reports", label: "Atendimento", comingSoon: true, disabled: true },
          { to: "/reports", label: "Visão Geral", comingSoon: true, disabled: true },
        ],
      },
    ],
  },
  {
    label: "Configurações",
    items: [
      { to: "/integrations", icon: Puzzle, label: "Integrações", comingSoon: true },
    ],
  },
];

const mobileNavItems = [
  { to: "/dashboard", icon: Home, label: "Início" },
  { to: "/conversations", icon: MessageSquare, label: "Conversas" },
  { to: "/agents", icon: Bot, label: "Agentes" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
];

export default function ClientLayout() {
  const { profile, user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [tenantPlan, setTenantPlan] = useState("starter");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const impersonatedTenant = useImpersonatedTenant();
  const impersonating = isImpersonating();

  useEffect(() => {
    if (!user) return;
    const query = impersonatedTenant
      ? supabase.from("tenants").select("plan").eq("id", impersonatedTenant).single()
      : supabase.from("tenants").select("plan").eq("owner_id", user.id).single();
    query.then(({ data }) => {
      if (data) setTenantPlan(data.plan || "starter");
    });
  }, [user, impersonatedTenant]);

  // Log page views when admin is impersonating a tenant
  useEffect(() => {
    if (!impersonating || !user) return;
    const tenantId = localStorage.getItem("admin_impersonating_tenant");
    if (!tenantId) return;

    supabase.from("audit_logs").insert({
      admin_user_id: user.id,
      tenant_id: tenantId,
      action: "impersonation_page_view",
      details: { page: location.pathname },
    }).then(() => {});
  }, [location.pathname, impersonating, user]);

  const isLightMode = typeof document !== "undefined" && document.documentElement.classList.contains("light");
  const logo = isLightMode ? meteoraLogoPreta : meteoraLogoBranca;

  const initials = (profile?.full_name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className={`flex min-h-screen w-full bg-background ${impersonating ? "pt-10" : ""}`}>
      <AdminBanner />
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={`fixed left-0 z-30 flex w-[240px] flex-col border-r border-white/[0.06] bg-sidebar ${impersonating ? "top-10 bottom-0" : "inset-y-0"}`}
          style={{ backgroundImage: "linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, transparent 40%)" }}
        >
          {/* Logo */}
          <div className="flex h-14 items-center px-5 pb-2 pt-4">
            <img src={logo} alt="Meteora Digital" className="h-[22px] opacity-90" />
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 pt-2 space-y-5 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30 px-3 mb-1.5">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isExpandable = !!item.expandKey;
                    const isExpanded = isExpandable && !!expandedSections[item.expandKey!];
                    const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");

                    if (!isExpandable) {
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          data-tour={item.to === "/conversations" ? "conversations-link" : item.to === "/channels" ? "channels-link" : undefined}
                          className="group relative flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13.5px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/80"
                          activeClassName="bg-cosmos-indigo/[0.15] text-cosmos-indigo"
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
                          <span className="truncate">{item.label}</span>
                          {item.comingSoon && (
                            <span className="text-[8px] font-medium bg-white/[0.06] text-white/30 px-1.5 py-0.5 rounded-full ml-auto">Em breve</span>
                          )}
                        </NavLink>
                      );
                    }

                    return (
                      <div key={item.to}>
                        {/* Expandable parent item */}
                        <div
                          className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13.5px] font-medium transition-all duration-200 hover:bg-white/[0.04] hover:text-white/80 cursor-pointer ${
                            isActive ? "bg-cosmos-indigo/[0.15] text-cosmos-indigo" : "text-white/50"
                          }`}
                          data-tour={item.to === "/channels" ? "channels-link" : undefined}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
                          <span
                            className="truncate flex-1"
                            onClick={() => navigate(item.to)}
                          >
                            {item.label}
                          </span>
                          {item.comingSoon && (
                            <span className="text-[8px] font-medium bg-white/[0.06] text-white/30 px-1.5 py-0.5 rounded-full">Em breve</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSections((prev) => ({
                                ...prev,
                                [item.expandKey!]: !prev[item.expandKey!],
                              }));
                            }}
                            className="ml-auto p-0.5 rounded hover:bg-white/[0.06] transition-colors"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                isExpanded ? "rotate-0" : "-rotate-90"
                              }`}
                              strokeWidth={2}
                            />
                          </button>
                        </div>

                        {/* Sub-items with collapse animation */}
                        <div
                          className={`overflow-hidden transition-all duration-200 ${
                            isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="space-y-0.5 pt-0.5">
                            {item.subItems?.map((sub) => {
                              if (sub.disabled) {
                                return (
                                  <div
                                    key={sub.label}
                                    className="flex items-center gap-2.5 rounded-lg pl-[38px] pr-3 py-[7px] text-[12.5px] font-medium text-white/30 cursor-default"
                                  >
                                    <span className="truncate">{sub.label}</span>
                                    {sub.comingSoon && (
                                      <span className="text-[8px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto whitespace-nowrap">
                                        Em breve
                                      </span>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <NavLink
                                  key={sub.label}
                                  to={sub.to}
                                  className="group flex items-center gap-2.5 rounded-lg pl-[38px] pr-3 py-[7px] text-[12.5px] font-medium text-white/40 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/70"
                                  activeClassName="text-cosmos-indigo/80"
                                >
                                  <span className="truncate">{sub.label}</span>
                                  {sub.comingSoon && (
                                    <span className="text-[8px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto whitespace-nowrap">
                                      Em breve
                                    </span>
                                  )}
                                </NavLink>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-white/[0.06] p-3 space-y-2">
            {tenantPlan === "enterprise" ? (
              <div className="flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-cosmos-cyan/10 to-cosmos-indigo/10 border border-cosmos-cyan/20 px-3 py-2">
                <Crown className="h-3.5 w-3.5 text-cosmos-cyan" />
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cosmos-cyan">✦ Enterprise</span>
              </div>
            ) : (
              <a
                href="/integrations"
                className="group relative flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold text-white transition-all duration-200 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #A78BFA)", boxShadow: "0 2px 8px rgba(99, 102, 241, 0.4)" }}
              >
                <Zap className="h-3.5 w-3.5" />
                Fazer Upgrade
                {/* Shine effect */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </a>
            )}

            {/* User info */}
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-display font-semibold text-[13px]" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-white/80">{profile?.full_name || "Usuário"}</p>
                <p className="text-[10px] text-white/30 font-mono capitalize">{tenantPlan}</p>
              </div>
              <NotificationBell />
              <UserMenu />
            </div>
            <div className="flex justify-center pt-1 pb-0.5">
              <MeteoraSeal size="small" />
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 cosmos-glow ${!isMobile ? "ml-[240px]" : ""} ${isMobile ? "pb-20" : ""}`}>
        <div className="mx-auto max-w-[1100px] px-3 py-4 sm:p-4 md:p-6 page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-white/[0.06] bg-background/95 backdrop-blur-lg">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 text-white/40"
              activeClassName="text-cosmos-indigo"
            >
              <item.icon className="h-5 w-5" strokeWidth={1.7} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          <div className="flex flex-col items-center gap-1">
            <NotificationBell />
            <span className="text-[10px] font-medium text-white/40">Alertas</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <UserMenu />
            <span className="text-[10px] font-medium text-white/40">Conta</span>
          </div>
        </nav>
      )}
    </div>
  );
}
