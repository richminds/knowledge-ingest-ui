import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BrainCircuit, LogOut, Moon, Sun } from "lucide-react";
import { KnowledgeIngest } from "@/pages/KnowledgeIngest";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

const THEME_KEY = "knowledge-ingest-theme";

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] animate-pulse">
        <BrainCircuit className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}

// As in makemerich-frontend's App.js: no session, no console.
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Console() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  if (!user) return null;

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
            {user.is_admin && (
              <Badge variant="outline" className="text-[10px] font-mono">
                admin
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
              onClick={() => void logout()}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-4 w-full xl:flex xl:flex-col xl:flex-1 xl:min-h-0">
        {/* Keyed on the user: switching user must start clean rather than carry
            over the previous user's staged files, job ids and chat transcript. */}
        <div className="xl:flex-1 xl:min-h-0">
          <KnowledgeIngest key={user.user_id} />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Console />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
