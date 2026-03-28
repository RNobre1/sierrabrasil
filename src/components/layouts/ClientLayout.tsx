import { Outlet } from "react-router-dom";
import { Home, MessageSquare, Bot, BarChart3, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Início" },
  { to: "/conversations", icon: MessageSquare, label: "Conversas" },
  { to: "/attendant/config", icon: Bot, label: "Atendente" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/account", icon: User, label: "Conta" },
];

export default function ClientLayout() {
  const { profile, signOut } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-[220px] flex-col border-r border-border bg-card">
          <div className="flex h-16 items-center gap-2 border-b border-border px-5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">M</span>
            </div>
            <span className="font-display font-semibold text-foreground">Meteora</span>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeClassName="bg-accent text-primary font-semibold"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || "Usuário"}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-1 text-muted-foreground" onClick={signOut}>
              Sair
            </Button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 ${!isMobile ? "ml-[220px]" : ""} ${isMobile ? "pb-20" : ""}`}>
        <div className="mx-auto max-w-[1200px] p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-card">
          {navItems.map((item) => (
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
        </nav>
      )}
    </div>
  );
}
