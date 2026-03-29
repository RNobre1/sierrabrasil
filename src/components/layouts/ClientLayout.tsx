import { Outlet } from "react-router-dom";
import { Home, MessageSquare, Bot, BarChart3, Radio, Puzzle, ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import UserMenu from "@/components/UserMenu";
import meteoraLogoBranca from "@/assets/meteora-branca.png";
import meteoraLogoPreta from "@/assets/meteora-preta.png";

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
  { to: "/channels", icon: Radio, label: "Canais" },
];

export default function ClientLayout() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();

  // Dark-first: root is dark by default, light only if .light class present
  const isLightMode = typeof document !== "undefined" && document.documentElement.classList.contains("light");
  const logo = isLightMode ? meteoraLogoPreta : meteoraLogoBranca;

  return (
    <div className="flex min-h-screen w-full bg-background meteora-noise">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-[232px] flex-col border-r border-border/40 bg-sidebar">
          {/* Logo */}
          <div className="flex h-14 items-center px-5">
            <img src={logo} alt="Meteora Digital" className="h-5 opacity-90" />
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 pt-2 space-y-5 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50 px-3 mb-1.5">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="group flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-medium text-sidebar-foreground/70 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-primary/8 text-primary border border-primary/8"
                    >
                      <item.icon className="h-[15px] w-[15px] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t border-border/30 p-3">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <UserMenu />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-sidebar-foreground/90">{profile?.full_name || "Usuário"}</p>
                <p className="text-[10px] text-muted-foreground/60 font-mono">Starter</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 ${!isMobile ? "ml-[232px]" : ""} ${isMobile ? "pb-20" : ""}`}>
        <div className="mx-auto max-w-[1100px] p-4 md:p-6 dash-page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border/40 bg-background/95 backdrop-blur-lg">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 text-muted-foreground"
              activeClassName="text-primary"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
          <div className="flex flex-col items-center gap-1">
            <UserMenu />
            <span className="text-[10px] font-medium text-muted-foreground">Conta</span>
          </div>
        </nav>
      )}
    </div>
  );
}
