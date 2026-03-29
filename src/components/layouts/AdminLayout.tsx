import { Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Bot, Cpu, Puzzle, ArrowLeftRight, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/tenants", icon: Users, label: "Clientes" },
  { to: "/admin/attendants", icon: Bot, label: "Agentes" },
  { to: "/admin/consumption", icon: Cpu, label: "Consumo IA" },
  { to: "/admin/integrations", icon: Puzzle, label: "Integrações" },
];

export default function AdminLayout() {
  const { signOut } = useAuth();
  const nav = useNavigate();

  return (
    <div className="flex min-h-screen w-full bg-background dark">
      {/* Admin Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">M</span>
          </div>
          <div>
            <span className="font-display font-semibold text-foreground text-sm">Meteora</span>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Mission Control</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {adminNavItems.map((item) => (
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
        <div className="border-t border-border p-3 space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => nav("/dashboard")}>
            <ArrowLeftRight className="h-4 w-4" /> Painel do Cliente
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-[240px]">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
