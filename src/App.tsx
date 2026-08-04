import { useEffect, useState } from "react";
import { BrainCircuit, LogOut, Moon, Sun } from "lucide-react";
import { KnowledgeIngest } from "@/pages/KnowledgeIngest";
import { AuthScreen } from "@/pages/AuthScreen";
import { GuestBanner } from "@/components/GuestBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const THEME_KEY = "knowledge-ingest-theme";

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] animate-pulse">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-border/60">
        <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">Knowledge Ingest</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-xs font-medium leading-tight">{user.name}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{user.email}</span>
            </div>
            <Badge variant={user.org_id ? "outline" : "warning"} className="text-[10px] font-mono">
              {user.org_id ?? "guest"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Toggle theme"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Log out"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        {!user.org_id && <GuestBanner />}
        <KnowledgeIngest />
      </main>
    </div>
  );
}
