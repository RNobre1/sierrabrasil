import { Outlet, useNavigate } from "react-router-dom";
import { Home, MessageSquare, Bot, BarChart3, Play } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import UserMenu from "@/components/UserMenu";
import meteoraLogo from "@/assets/meteora-branca.png";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Início" },
  { to: "/conversations", icon: MessageSquare, label: "Conversas" },
  { to: "/attendant/config", icon: Bot, label: "Atendente" },
  { to: "/attendant/playground", icon: Play, label: "Playground" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
];

export default function ClientLayout() {
  const { profile } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full bg-background meteora-noise">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-[220px] flex-col border-r border-border/50 bg-sidebar">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border/50 px-5">
            <img src={meteoraLogo} alt="Meteora Digital" className="h-6" />
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 p-3 pt-5">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60 px-3 mb-3">Menu</p>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                activeClassName="bg-primary/10 text-primary border border-primary/10"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t border-border/50 p-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <UserMenu />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground">{profile?.full_name || "Usuário"}</p>
                <p className="text-[10px] text-muted-foreground font-mono">Starter</p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 ${!isMobile ? "ml-[220px]" : ""} ${isMobile ? "pb-20" : ""}`}>
        <div className="mx-auto max-w-[1100px] p-4 md:p-6 dash-page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border/50 bg-background/95 backdrop-blur-lg">
          {navItems.slice(0, 4).map((item) => (
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
