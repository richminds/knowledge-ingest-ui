import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  BrainCircuit,
  Building2,
  Database,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { authErrorMessage } from "@/api/authClient";
import { GUEST_ORG_ID } from "@/api/authTypes";
import { Button } from "@/components/ui/button";

// Layout/treatment ported from the makemerich frontend's Login.js + Register.js
// (gradient hero, floating circles, split marketing panel with glass feature
// cards, elevated form card, icon-adorned fields, divider + mode-switch link) —
// rebuilt in Tailwind because this app has no MUI, and pointed at auth-service
// (see api/authEndpoints.ts) rather than makemerich-backend's /token endpoint.
type Mode = "login" | "register";

const FEATURES: Record<Mode, { icon: typeof Database; title: string; body: string }[]> = {
  login: [
    {
      icon: Database,
      title: "Document Ingestion",
      body: "Upload PDFs, text and markdown straight into the RAG vector store",
    },
    {
      icon: Sparkles,
      title: "Retrieval Testing",
      body: "Ask questions and see exactly which chunks the answer came from",
    },
    {
      icon: ShieldCheck,
      title: "Scoped by Account",
      body: "Every chunk is tagged and filtered by the account you belong to",
    },
  ],
  register: [
    {
      icon: Sparkles,
      title: "Instant Setup",
      body: "Create an account and start ingesting documents in under a minute",
    },
    {
      icon: ShieldCheck,
      title: "Isolated by Design",
      body: "Your documents stay scoped to your account — never mixed with others",
    },
    {
      icon: Database,
      title: "Durable Storage",
      body: "Uploads persist in MongoDB GridFS and survive service restarts",
    },
  ],
};

const COPY: Record<Mode, { lead: string; accent: string; blurb: string; heading: string; sub: string }> = {
  login: {
    lead: "Welcome Back to",
    accent: "Knowledge Ingest",
    blurb:
      "Pick up where you left off — upload new documents, inspect what's indexed, and test retrieval end to end.",
    heading: "Welcome Back",
    sub: "Sign in to access your ingestion console",
  },
  register: {
    lead: "Build Your Own",
    accent: "Knowledge Base",
    blurb:
      "Create an account to ingest documents, index them for retrieval, and query them with full source attribution.",
    heading: "Create Account",
    sub: "Start ingesting documents today",
  },
};

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState(GUEST_ORG_ID);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side check first (makemerich's Register.js does the same) — the
    // service never sees the confirmation field.
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login({ email: email.trim().toLowerCase(), password });
        toast.success("Signed in");
      } else {
        await register({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          password,
          org_id: orgId.trim() || GUEST_ORG_ID,
        });
        toast.success("Account created");
      }
    } catch (err) {
      const message = authErrorMessage(
        err,
        "Something went wrong — check the auth service is reachable."
      );
      setError(message);
      toast.error(mode === "login" ? "Sign in failed" : "Could not create account", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const copy = COPY[mode];

  return (
    <div className="relative min-h-full overflow-hidden bg-[linear-gradient(135deg,#312e81_0%,#6366f1_55%,#8b5cf6_100%)]">
      {/* Floating background circles */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 animate-float" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/5 animate-float-reverse" />

      <div className="relative mx-auto grid min-h-full max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        {/* ── Left: marketing panel (desktop only) ───────────────────── */}
        <div className="hidden text-white animate-fade-in-slow lg:block lg:pr-6">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/95 shadow-[0_14px_36px_rgba(0,0,0,0.35)]">
            <BrainCircuit className="h-11 w-11 text-[#6366f1]" />
          </div>

          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight">
            {copy.lead}
            <span className="block text-[#c4b5fd]">{copy.accent}</span>
          </h1>
          <p className="mb-8 max-w-lg text-base leading-relaxed text-white/90">{copy.blurb}</p>

          <div className="space-y-3">
            {FEATURES[mode].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
              >
                <div className="mb-1 flex items-center gap-2.5">
                  <Icon className="h-5 w-5 shrink-0 text-[#2ec28a]" />
                  <span className="text-base font-semibold text-white">{title}</span>
                </div>
                <p className="text-sm text-white/80">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: auth form ───────────────────────────────────────── */}
        <div className="mx-auto w-full max-w-[500px] animate-slide-up">
          <div className="rounded-3xl border border-white/20 bg-card/95 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
            <div className="mb-7 flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] shadow-[0_16px_40px_rgba(99,102,241,0.45)]">
                <BrainCircuit className="h-9 w-9 text-white" />
              </div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Knowledge Ingest
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight">{copy.heading}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy.sub}</p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-[#ff5d6c]/25 bg-[#ff5d6c]/10 px-3 py-2.5 text-[13px] text-[#ff5d6c]">
                <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <Field
                  icon={User}
                  label="Full Name"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={setName}
                  required
                />
              )}

              <Field
                icon={Mail}
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={setEmail}
                required
              />

              <Field
                icon={Lock}
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={setPassword}
                required
                minLength={6}
                trailing={
                  <RevealButton shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
                }
              />

              {mode === "register" && (
                <>
                  <Field
                    icon={Lock}
                    label="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    required
                    minLength={6}
                    trailing={
                      <RevealButton
                        shown={showConfirmPassword}
                        onToggle={() => setShowConfirmPassword((s) => !s)}
                      />
                    }
                  />

                  <div>
                    <Field
                      icon={Building2}
                      label="Account ID"
                      placeholder={GUEST_ORG_ID}
                      value={orgId}
                      onChange={setOrgId}
                    />
                    <p className="mt-1.5 pl-0.5 text-[11px] text-muted-foreground">
                      Defaults to the shared <span className="font-medium">Guest</span> account —
                      replace it with a specific Account ID if you have one.
                    </p>
                  </div>
                </>
              )}

              <Button type="submit" className="h-11 w-full text-sm" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === "login" ? "Signing In…" : "Creating Account…"}
                  </>
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                {mode === "login" ? "New to Knowledge Ingest?" : "Already have an account?"}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                {mode === "login" ? "Create Your Account" : "Sign In Instead"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-muted-foreground transition-colors hover:text-foreground"
      aria-label={shown ? "Hide password" : "Show password"}
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  trailing,
  className,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  trailing?: React.ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div>
      <label className="mb-1.5 block pl-0.5 text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-11 w-full rounded-lg border border-border bg-background pl-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            trailing ? "pr-10" : "pr-3",
            className
          )}
          {...props}
        />
        {trailing && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
    </div>
  );
}
