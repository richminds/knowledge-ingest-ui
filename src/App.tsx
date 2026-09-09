import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrainCircuit, LogOut, Moon, Sun } from "lucide-react";
import { KnowledgeIngest } from "@/pages/KnowledgeIngest";
import { AuthScreen } from "@/pages/AuthScreen";
import { GuestBanner } from "@/components/GuestBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { GUEST_ORG_ID } from "@/api/authTypes";

const THEME_KEY = "knowledge-ingest-theme";

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const { user, accountId, accounts, pendingAccountChoice, loading, logout } = useAuth();

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

  // AuthScreen doubles as the account picker for a user who belongs to more
  // than one application — the session exists by then, but which account it's
  // scoped to isn't settled yet.
  if (!user || pendingAccountChoice) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-full xl:h-screen xl:flex xl:flex-col xl:overflow-hidden">
      <header className="border-b border-border/60 shrink-0">
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
            {accountId && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {accounts.find((a) => a.account_id === accountId)?.name ?? accountId}
              </Badge>
            )}
            <Badge
              variant={user.org_id === GUEST_ORG_ID ? "warning" : "outline"}
              className="text-[10px] font-mono"
            >
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
              onClick={async () => {
                // logout() clears the session even if the revoke call fails,
                // so this always resolves — see lib/auth.tsx.
                await logout();
                toast.success("Logged out");
              }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-4 w-full xl:flex xl:flex-col xl:flex-1 xl:min-h-0">
        {(user.org_id === GUEST_ORG_ID || !user.org_id) && (
          <div className="shrink-0">
            <GuestBanner />
          </div>
        )}
        <div className="xl:flex-1 xl:min-h-0">
          <KnowledgeIngest />
        </div>
      </main>
    </div>
  );
}
