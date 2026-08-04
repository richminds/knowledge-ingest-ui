import { useState } from "react";
import { toast } from "sonner";
import {
  BrainCircuit,
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Plus,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { authErrorMessage } from "@/api/authClient";
import { OrganizationsApi } from "@/api/authEndpoints";
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
  const [orgId, setOrgId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [justCreatedOrgId, setJustCreatedOrgId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreateOrg() {
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      const org = await OrganizationsApi.register(newOrgName.trim());
      setOrgId(org.org_id);
      setJustCreatedOrgId(org.org_id);
      toast.success("Organization created", { description: `${org.name} — ${org.org_id}` });
    } catch (err) {
      toast.error("Could not create organization", {
        description: authErrorMessage(err, "The auth service is unreachable."),
      });
    } finally {
      setCreatingOrg(false);
    }
  }

  async function handleCopy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
          org_id: orgId.trim() || undefined,
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
              <div className="space-y-2">
                <Field
                  icon={Building2}
                  placeholder="Organization ID (optional)"
                  value={orgId}
                  onChange={(v) => {
                    setOrgId(v);
                    setJustCreatedOrgId(null);
                  }}
                />
                <p className="text-[10px] text-muted-foreground pl-0.5">
                  Leave blank to sign up as a guest — you can join an organization later.
                </p>

                {justCreatedOrgId && (
                  <div className="flex items-center gap-2 text-[10px] px-2.5 py-1.5 rounded-md bg-[#2ec28a]/10 border border-[#2ec28a]/25 text-[#2ec28a]">
                    <Check className="w-3 h-3 shrink-0" />
                    <span className="flex-1 font-mono truncate">{justCreatedOrgId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(justCreatedOrgId)}
                      className="hover:text-foreground shrink-0"
                      aria-label="Copy organization ID"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}

                {!showCreateOrg ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateOrg(true)}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    Create a new organization instead
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="New organization name"
                      className="flex-1 h-8 rounded-md border border-border bg-background px-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs shrink-0"
                      disabled={!newOrgName.trim() || creatingOrg}
                      onClick={handleCreateOrg}
                    >
                      {creatingOrg ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create"}
                    </Button>
                  </div>
                )}
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
