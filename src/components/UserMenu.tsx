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

function applyTheme(t: Theme) {
  localStorage.setItem("theme", t);
  const root = document.documentElement;
  if (t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
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
        <button className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-primary">{initial}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{profile?.full_name || "Usuário"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/account")} className="gap-2 cursor-pointer">
          <User className="h-4 w-4" /> Perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/attendant/config")} className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4" /> Configurações
        </DropdownMenuItem>

        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin/dashboard")} className="gap-2 cursor-pointer">
            <Shield className="h-4 w-4" /> Painel Admin
          </DropdownMenuItem>
        )}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            Aparência
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 cursor-pointer">
              <Sun className="h-4 w-4" /> Claro {theme === "light" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 cursor-pointer">
              <Moon className="h-4 w-4" /> Escuro {theme === "dark" && "✓"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2 cursor-pointer">
              <Monitor className="h-4 w-4" /> Sistema {theme === "system" && "✓"}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/account")} className="gap-2 cursor-pointer">
          <CreditCard className="h-4 w-4" /> Meu Plano
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
          <LifeBuoy className="h-4 w-4" /> Suporte
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
          <FileText className="h-4 w-4" /> Documentação
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/dashboard")} className="gap-2 cursor-pointer">
          <Home className="h-4 w-4" /> Página Inicial
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
