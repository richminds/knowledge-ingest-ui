import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  BrainCircuit,
  Building2,
  Database,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { authErrorMessage } from "@/api/authClient";
import { Button } from "@/components/ui/button";
import { Field, RevealButton } from "@/components/ui/field";
import { ForgotPasswordForm, ResetPasswordForm } from "./passwordResetForms";

// Layout/treatment ported from the makemerich frontend's Login.js (gradient
// hero, floating circles, split marketing panel with glass feature cards,
// elevated form card, icon-adorned fields) — rebuilt in Tailwind because this
// app has no MUI, and pointed at auth-service (see api/authEndpoints.ts).
//
// Two things happen here: signing in, and creating a user. APP ACCOUNTS are
// still provisioned only in the account-management console — what this screen
// can create is a USER inside the one guest account (see lib/auth.tsx
// ::register). Either way the session ends on the account-confirmation step
// before the console opens.
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

/** The `token` query parameter from an emailed reset link, if present.
 *
 *  This console has no router, so the reset screen is selected by the URL
 *  rather than navigated to. App.tsx reads this and renders AuthScreen even
 *  for a signed-in user — someone with a live session is often exactly who is
 *  resetting a password. */
export function readResetToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = new URLSearchParams(window.location.search).get("token");
  return token && token.trim() ? token : null;
}

/** Drop the token from the address bar once it has been redeemed or
 *  abandoned, so a reload doesn't reopen the reset form holding a token the
 *  server has since marked used — which would report "already used" for a
 *  reset that actually worked. replaceState so Back doesn't return to it. */
function clearResetToken() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("token");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function AuthScreen({ initialToken = null }: { initialToken?: string | null }) {
  const { login, register, selectAccount, accounts, pendingAccountChoice } = useAuth();
  // "signin" | "register" — the account picker is a third state, but it is
  // driven by pendingAccountChoice rather than by this, because it is reached
  // from both of the others.
  const [mode, setMode] = useState<"signin" | "register" | "forgot">("signin");
  // Set from the emailed link (or, in development, from the token
  // auth-service hands back when it has no mailer). Non-null means the reset
  // form replaces every other view.
  const [resetToken, setResetToken] = useState<string | null>(initialToken);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [chosenAccount, setChosenAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: "signin" | "register" | "forgot") {
    // Clear the error, not the credentials: someone who mistypes an email on
    // sign-up and switches to sign in shouldn't have to retype it.
    setError(null);
    setMode(next);
  }

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const available = await register({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password,
      });
      // register() returns a token, so the user is already signed in; the
      // guest account still gets confirmed on the next step, exactly as it
      // would for a returning user.
      if (available.length > 0) {
        const preselected = available.find((a) => a.selected) ?? available[0];
        setChosenAccount(preselected.account_id);
      } else {
        toast.success("Account created");
      }
    } catch (err) {
      const message = authErrorMessage(
        err,
        "Could not create the account — check the auth service is reachable."
      );
      setError(message);
      toast.error("Could not create account", { description: message });
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
  const copy = resetToken
    ? {
        lead: "Choose a New",
        accent: "Password",
        blurb:
          "Pick a new password for your Knowledge Ingest account. The link that brought you here works once, and only for a short while.",
        heading: "Choose a New Password",
        sub: "Set the password you'll sign in with",
      }
    : mode === "forgot"
      ? {
          lead: "Locked Out of",
          accent: "Knowledge Ingest",
          blurb:
            "Tell us the email you signed up with and we'll send a link to choose a new password.",
          heading: "Forgot Password?",
          sub: "We'll email you a reset link",
        }
    : pendingAccountChoice
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
    : mode === "register"
      ? {
          lead: "Get Started with",
          accent: "Knowledge Ingest",
          blurb:
            "Create an account to upload documents, inspect what's indexed, and test retrieval end to end.",
          heading: "Create Account",
          sub: "Set up a guest account to get started",
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

            {resetToken ? (
              <ResetPasswordForm
                token={resetToken}
                setError={setError}
                onDone={() => {
                  clearResetToken();
                  setResetToken(null);
                  setError(null);
                  setMode("signin");
                }}
              />
            ) : mode === "forgot" ? (
              <ForgotPasswordForm
                setError={setError}
                onBack={() => switchMode("signin")}
                onHasToken={(t) => {
                  setError(null);
                  setResetToken(t);
                }}
              />
            ) : pendingAccountChoice ? (
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
              <form
                onSubmit={mode === "register" ? handleRegister : handleSignIn}
                className="space-y-4"
              >
                {mode === "register" && (
                  <Field
                    icon={User}
                    label="Your Name"
                    type="text"
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

                {mode === "signin" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary transition-colors hover:underline"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="h-11 w-full text-sm" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === "register" ? "Creating…" : "Signing In…"}
                    </>
                  ) : mode === "register" ? (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-2 text-[11px] text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full text-sm"
                  disabled={submitting}
                  onClick={() => switchMode(mode === "register" ? "signin" : "register")}
                >
                  {mode === "register" ? (
                    "I already have an account"
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              {resetToken
                ? "This link works once. Request another if it has expired."
                : mode === "forgot"
                  ? "For security we send the same confirmation whether or not the address is registered."
                  : mode === "register"
                    ? "New users start in the Guest account — an administrator can move you to another one later."
                    : "Signing in gets you the accounts an administrator has given you."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

