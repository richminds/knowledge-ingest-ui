import { useState } from "react";
import { BrainCircuit, Building2, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { authErrorMessage } from "@/api/authClient";
import { GUEST_ORG_ID } from "@/api/authTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Mode = "login" | "register";

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState(GUEST_ORG_ID);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login({ email: email.trim().toLowerCase(), password });
      } else {
        await register({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          password,
          org_id: orgId.trim() || GUEST_ORG_ID,
        });
      }
    } catch (err) {
      setError(authErrorMessage(err, "Something went wrong — check the auth service is reachable."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-[420px] animate-fade-in">
        <CardContent className="pt-6 pb-6 space-y-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1]">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Knowledge Ingest</h1>
              <p className="text-xs text-muted-foreground">
                {mode === "login" ? "Sign in to continue" : "Create your account"}
              </p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border p-0.5 bg-secondary/40">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  "flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors",
                  mode === m
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <Field icon={User} placeholder="Full name" value={name} onChange={setName} required />
            )}
            <Field
              icon={Mail}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              required
            />
            <div className="relative">
              <Field
                icon={Lock}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={setPassword}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {mode === "register" && (
              <div className="space-y-1.5">
                <Field icon={Building2} placeholder="Organization ID" value={orgId} onChange={setOrgId} />
                <p className="text-[10px] text-muted-foreground pl-0.5">
                  Defaults to the shared <span className="font-medium">Guest</span> organization —
                  replace it with a specific Organization ID if you have one.
                </p>
              </div>
            )}

            {error && (
              <p className="text-[11px] text-[#ff5d6c] bg-[#ff5d6c]/10 border border-[#ff5d6c]/25 rounded-md px-2.5 py-1.5">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full h-9" disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  icon: Icon,
  value,
  onChange,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
      />
    </div>
  );
}
