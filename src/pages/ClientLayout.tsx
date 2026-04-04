import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Home, MessageSquare, Bot, BarChart3, Radio, Puzzle, Zap, Crown, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import UserMenu from "@/components/UserMenu";
import meteoraLogoBranca from "@/assets/meteora-branca.png";
import { MeteoraSeal } from "@/components/MeteoraBrand";

const navSections = [
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
      { to: "/channels", icon: Radio, label: "Canais de Conexão" },
    ],
  },
  {
    label: "Análise",
    items: [
      { to: "/reports", icon: BarChart3, label: "Relatórios" },
    ],
  },
  {
    label: "Configurações",
    items: [
      { to: "/integrations", icon: Puzzle, label: "Integrações" },
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
  const [tenantPlan, setTenantPlan] = useState("starter");

  useEffect(() => {
    if (!user) return;
    supabase.from("tenants").select("plan").eq("owner_id", user.id).single().then(({ data }) => {
      if (data) setTenantPlan(data.plan || "starter");
    });
  }, [user]);

  const initials = (profile?.full_name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className="fixed inset-y-0 left-0 z-30 flex w-[220px] flex-col border-r border-white/[0.06]"
          style={{
            background: "hsl(230 30% 3%)",
            backgroundImage: "linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, transparent 40%)",
          }}
        >
          {/* Logo */}
          <div className="flex h-14 items-center px-4 pb-2 pt-4">
            <img src={meteoraLogoBranca} alt="Meteora Digital" className="h-[20px] opacity-90" />
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2.5 pt-2 space-y-4 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.1em] text-white/20 px-3 mb-1">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="group relative flex items-center gap-2.5 rounded-lg px-3 py-[8px] text-[13px] font-medium text-white/40 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/70"
                      activeClassName="bg-indigo-500/[0.15] text-indigo-400"
                    >
                      <item.icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.7} />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-white/[0.06] p-2.5 space-y-2">
            {tenantPlan === "enterprise" ? (
              <div className="flex items-center justify-center gap-2 rounded-[9px] bg-gradient-to-r from-cyan-500/8 to-indigo-500/8 border border-cyan-500/15 px-3 py-2">
                <Crown className="h-3 w-3 text-cyan-400" />
                <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-cyan-400">✦ Enterprise</span>
              </div>
            ) : (
              <a
                href="/integrations"
                className="group relative flex items-center justify-center gap-2 rounded-[9px] px-3 py-2 text-[12px] font-semibold text-white transition-all duration-200 overflow-hidden bg-gradient-to-r from-indigo-500 via-violet-500 to-violet-400 shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
              >
                <Zap className="h-3 w-3" />
                Fazer Upgrade
              </a>
            )}

            {/* User info */}
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-display font-semibold text-[11px] bg-gradient-to-br from-indigo-500 to-violet-500">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate text-white/70">{profile?.full_name || "Usuário"}</p>
                <p className="text-[9px] text-white/20 font-mono capitalize">{tenantPlan}</p>
              </div>
              <UserMenu />
            </div>
            <div className="flex justify-center pt-0.5 pb-0.5">
              <MeteoraSeal size="small" />
            </div>
          </div>
        </aside>
      )}

      {/* Main content — WIDER */}
      <main className={`flex-1 cosmos-glow ${!isMobile ? "ml-[220px]" : ""} ${isMobile ? "pb-20" : ""}`}>
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-4 md:py-5 page-enter">
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
              activeClassName="text-indigo-400"
            >
              <item.icon className="h-5 w-5" strokeWidth={1.7} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          <div className="flex flex-col items-center gap-1">
            <UserMenu />
            <span className="text-[10px] font-medium text-white/40">Conta</span>
          </div>
        </nav>
      )}
    </div>
  );
}
