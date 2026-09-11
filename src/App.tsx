import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrainCircuit, LogOut, Moon, Sun } from "lucide-react";
import { KnowledgeIngest } from "@/pages/KnowledgeIngest";
import { AuthScreen, readResetToken } from "@/pages/AuthScreen";
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
  const { user, accountId, accounts, pendingAccountChoice, loading, logout } = useAuth();
  // Read once on mount: AuthScreen strips the parameter after a reset, and
  // re-reading would flip the screen away mid-flow.
  const [resetToken] = useState(readResetToken);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Ahead of the session check on purpose — a reset link is often opened by
  // someone who still has a live session, and dropping them into the console
  // would strand the link.
  if (resetToken) return <AuthScreen initialToken={resetToken} />;

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] animate-pulse">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
      </div>
    );
  }

  // AuthScreen doubles as the account picker — after sign-in the session
  // exists, but which account it is scoped to isn't settled until the user
  // confirms one (see lib/auth.tsx::login).
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
            {!accountId && (
              <Badge variant="warning" className="text-[10px] font-mono">
                no account
              </Badge>
            )}
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
        {/* Keyed on the user AND the account: the console is scoped to that
            combination, so switching either one must start clean. Without the
            key, React reuses the mounted tree and its local state — a queued
            job id, staged files, the test-chat transcript — would carry over
            from the previous account and read as if it belonged to the new
            one. Remounting also drops per-account query caches on the floor
            rather than briefly showing another account's files. */}
        <div className="xl:flex-1 xl:min-h-0">
          <KnowledgeIngest key={`${user.user_id}:${accountId ?? "none"}`} />
        </div>
      </main>
    </div>
  );
}
