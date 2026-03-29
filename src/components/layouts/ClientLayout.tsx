import { Outlet, useNavigate } from "react-router-dom";
import { Home, MessageSquare, Bot, BarChart3, User, Play, LogOut, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Início" },
  { to: "/conversations", icon: MessageSquare, label: "Conversas" },
  { to: "/attendant/config", icon: Bot, label: "Atendente" },
  { to: "/attendant/playground", icon: Play, label: "Playground" },
  { to: "/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/account", icon: User, label: "Conta" },
];

export default function ClientLayout() {
  const { profile, isAdmin, signOut } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-border bg-card">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-display font-bold text-sm">M</span>
            </div>
            <div>
              <span className="font-display font-semibold text-foreground text-[15px]">Meteora</span>
              <p className="text-[10px] text-muted-foreground font-mono leading-none">AI Attendant</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 p-3 pt-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-3 mb-2">Menu</p>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                activeClassName="bg-primary/10 text-primary font-semibold shadow-sm"
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {/* Admin link */}
            {isAdmin && (
              <>
                <div className="my-3 border-t border-border" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-3 mb-2">Admin</p>
                <NavLink
                  to="/admin/dashboard"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
                  activeClassName="bg-primary/10 text-primary font-semibold shadow-sm"
                >
                  <Shield className="h-[18px] w-[18px]" />
                  <span>Painel Admin</span>
                </NavLink>
              </>
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-primary">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{profile?.full_name || "Usuário"}</p>
                <p className="text-[10px] text-muted-foreground">Plano Starter</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2 text-muted-foreground hover:text-destructive justify-start gap-2" 
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 ${!isMobile ? "ml-[240px]" : ""} ${isMobile ? "pb-20" : ""}`}>
        <div className="mx-auto max-w-[1200px] p-4 md:p-6 dash-page-enter">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm">
          {navItems.slice(0, 5).map((item) => (
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
