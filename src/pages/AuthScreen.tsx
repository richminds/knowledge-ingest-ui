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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { authErrorMessage } from "@/api/authClient";
import { Button } from "@/components/ui/button";

// Layout/treatment ported from the makemerich frontend's Login.js (gradient
// hero, floating circles, split marketing panel with glass feature cards,
// elevated form card, icon-adorned fields) — rebuilt in Tailwind because this
// app has no MUI, and pointed at auth-service (see api/authEndpoints.ts).
//
// Sign-in only: this console never creates users. Accounts and their
// application memberships are provisioned in the account-management console;
// people sign in with what they were given, and pick which application to
// work under when they belong to more than one.
const FEATURES = [
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
    body: "Every chunk is tagged and filtered by the account you sign in under",
  },
];

export function AuthScreen() {
  const { login, selectAccount, accounts, pendingAccountChoice } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [chosenAccount, setChosenAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const available = await login({ email: email.trim().toLowerCase(), password });
      if (available.length > 0) {
        // The session exists but is still parked on their default account
        // until they confirm one (see AuthProvider.login). Pre-select the
        // account auth-service already scoped the token to — read from the
        // RETURNED list rather than the `accountId` in scope, which is still
        // the pre-login value on this render.
        const preselected = available.find((a) => a.selected) ?? available[0];
        setChosenAccount(preselected.account_id);
      } else {
        // No account to confirm — straight in, unscoped.
        toast.success("Signed in");
      }
    } catch (err) {
      const message = authErrorMessage(
        err,
        "Something went wrong — check the auth service is reachable."
      );
      setError(message);
      toast.error("Sign in failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChooseAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await selectAccount(chosenAccount);
      toast.success("Signed in");
    } catch (err) {
      const message = authErrorMessage(err, "Could not switch to that account.");
      setError(message);
      toast.error("Account selection failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  const multiple = accounts.length > 1;
  const copy = pendingAccountChoice
    ? {
        lead: "Choose Your",
        accent: "Account",
        blurb: multiple
          ? "You belong to more than one application. Everything you ingest and every answer you get back is scoped to the one you pick."
          : "Everything you ingest and every answer you get back is scoped to this account.",
        heading: "Select Account",
        sub: multiple
          ? "Pick the application to work under"
          : "Confirm the application to work under",
      }
    : {
        lead: "Welcome Back to",
        accent: "Knowledge Ingest",
        blurb:
          "Pick up where you left off — upload new documents, inspect what's indexed, and test retrieval end to end.",
        heading: "Welcome Back",
        sub: "Sign in to access your ingestion console",
      };

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
            {FEATURES.map(({ icon: Icon, title, body }) => (
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

            {pendingAccountChoice ? (
              <form onSubmit={handleChooseAccount} className="space-y-4">
                <div>
                  <label className="mb-1.5 block pl-0.5 text-xs font-medium text-muted-foreground">
                    {multiple ? "Accounts (" + accounts.length + ")" : "Account"}
                  </label>

                  {/* A visible list rather than a <select>: the account decides
                      what every upload is tagged with and what a query can see,
                      so the options are worth showing outright instead of
                      hiding them behind a closed dropdown. Radio inputs (not
                      buttons) so arrow keys move between accounts and the group
                      is announced as one choice. */}
                  <div
                    role="radiogroup"
                    aria-label="Account to work under"
                    className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5"
                  >
                    {accounts.map((account) => {
                      const active = account.account_id === chosenAccount;
                      return (
                        <label
                          key={account.account_id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                            active
                              ? "border-[#6366f1] bg-[#6366f1]/10"
                              : "border-border hover:bg-muted/60"
                          )}
                        >
                          <input
                            type="radio"
                            name="account"
                            value={account.account_id}
                            checked={active}
                            onChange={() => setChosenAccount(account.account_id)}
                            className="sr-only"
                          />
                          <Building2
                            className={cn(
                              "h-4 w-4 shrink-0",
                              active ? "text-[#6366f1]" : "text-muted-foreground"
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {account.name}
                          </span>
                          <span
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors",
                              active ? "border-[#6366f1] bg-[#6366f1]" : "border-border"
                            )}
                            aria-hidden
                          />
                        </label>
                      );
                    })}
                  </div>

                  <p className="mt-2 pl-0.5 text-[11px] text-muted-foreground">
                    Documents and answers are scoped to this account — you can sign out and back in
                    to switch.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full text-sm"
                  disabled={submitting || !chosenAccount}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Continuing…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
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
                  placeholder="Your password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={6}
                  trailing={
                    <RevealButton
                      shown={showPassword}
                      onToggle={() => setShowPassword((s) => !s)}
                    />
                  }
                />

                <Button type="submit" className="h-11 w-full text-sm" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In…
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Accounts are created by your administrator — contact them if you can't sign in.
            </p>
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
