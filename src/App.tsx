import { useEffect, useState } from "react";
import { BrainCircuit, Moon, Sun } from "lucide-react";
import { KnowledgeIngest } from "@/pages/KnowledgeIngest";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const THEME_KEY = "knowledge-ingest-theme";

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Shown in the header so it's obvious which RAG instance uploads land in.
const TARGET = import.meta.env.VITE_API_BASE_URL || "local proxy";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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
            <Badge variant="outline" className="text-[10px] font-mono max-w-[240px] truncate">
              {TARGET}
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
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-4 w-full xl:flex xl:flex-col xl:flex-1 xl:min-h-0">
        <div className="xl:flex-1 xl:min-h-0">
          <KnowledgeIngest />
        </div>
      </main>
    </div>
  );
}
