import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Bot, Cpu, Puzzle, ArrowLeftRight, LogOut, Menu, X } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const adminNavItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/tenants", icon: Users, label: "Clientes" },
  { to: "/admin/attendants", icon: Bot, label: "Agentes" },
  { to: "/admin/consumption", icon: Cpu, label: "Consumo IA" },
];

const comingSoonNavItems = [
  { icon: Puzzle, label: "Integrações" },
];

export default function AdminLayout() {
  const { signOut } = useAuth();
  const nav = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-sm">M</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-display font-semibold text-foreground text-sm">Meteora</span>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Mission Control</p>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-accent">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            activeClassName="bg-accent text-primary font-semibold"
            onClick={() => { if (isMobile) setSidebarOpen(false); }}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {comingSoonNavItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
            <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1.5">Em breve</Badge>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3 space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => { nav("/dashboard"); if (isMobile) setSidebarOpen(false); }}>
          <ArrowLeftRight className="h-4 w-4" /> Painel do Cliente
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background dark">
      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-accent">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xs">M</span>
            </div>
            <span className="font-display font-semibold text-foreground text-sm">Mission Control</span>
          </div>
          <div className="w-8" />
        </header>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex w-[260px] flex-col bg-card border-r border-border h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-border bg-card">
          {sidebarContent}
        </aside>
      )}

      {/* Main */}
      <main className={`flex-1 ${!isMobile ? "ml-[240px]" : "pt-14"}`}>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
