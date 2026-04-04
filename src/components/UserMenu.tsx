import { useNavigate } from "react-router-dom";
import { User, Settings, CreditCard, Sun, Moon, Monitor, LifeBuoy, FileText, Home, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getTheme(): Theme {
  return (localStorage.getItem("theme") as Theme) || "system";
}

function applyTheme() {
  // Dark mode only — no light mode for now
  const root = document.documentElement;
  root.classList.remove("light");
  root.classList.add("dark");
}

export default function UserMenu() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>(getTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border/50 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-primary">{initial}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56 ml-2 mr-2">
        <DropdownMenuLabel className="font-normal px-3 py-2.5">
          <p className="text-sm font-medium truncate text-foreground">{profile?.full_name || "Usuário"}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/account")} className="gap-2.5 cursor-pointer px-3 py-2">
          <User className="h-4 w-4 text-muted-foreground" /> Perfil
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="gap-2.5 cursor-pointer px-3 py-2">
            <Shield className="h-4 w-4 text-muted-foreground" /> Painel Admin
          </DropdownMenuItem>
        )}


        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => { navigate("/account"); setTimeout(() => document.querySelector('[data-tour="account-plan"]')?.scrollIntoView({ behavior: "smooth" }), 100); }} className="gap-2.5 cursor-pointer px-3 py-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" /> Meu Plano
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2.5 cursor-pointer px-3 py-2" disabled>
          <LifeBuoy className="h-4 w-4 text-muted-foreground" /> Suporte
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2.5 cursor-pointer px-3 py-2" disabled>
          <FileText className="h-4 w-4 text-muted-foreground" /> Documentação
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/dashboard")} className="gap-2.5 cursor-pointer px-3 py-2">
          <Home className="h-4 w-4 text-muted-foreground" /> Página Inicial
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={signOut} className="gap-2.5 cursor-pointer px-3 py-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
