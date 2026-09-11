import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import { AuthApi } from "@/api/authEndpoints";
import { authErrorMessage } from "@/api/authClient";
import { Button } from "@/components/ui/button";
import { Field, RevealButton } from "@/components/ui/field";

/**
 * The two password-reset forms.
 *
 * Form BODIES only — the gradient backdrop, marketing panel and card are
 * AuthScreen's, and the heading/subtitle come from its `copy` map, exactly as
 * the sign-in, sign-up and account-picker forms work. Keeping them here rather
 * than inline stops AuthScreen growing a fourth and fifth <form> in one
 * component.
 *
 * Errors are raised through `setError` so they render in the card's single
 * error strip, in the same place every other failure on this screen appears.
 */

/** Matches auth-service's ResetPasswordRequest.new_password minimum (which is
 *  RegisterRequest's), so a reset can't set a password sign-up would refuse.
 *  Checked here to fail fast — the server is the authority. */
const MIN_PASSWORD = 6;

export function ForgotPasswordForm({
  onBack,
  onHasToken,
  setError,
}: {
  onBack: () => void;
  onHasToken: (token: string) => void;
  setError: (message: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await AuthApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
      setDebugToken(res.debug_token ?? null);
    } catch (err) {
      const message = authErrorMessage(
        err,
        "Something went wrong — check the auth service is reachable."
      );
      setError(message);
      toast.error("Couldn't send the reset link", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  // Deliberately does NOT say whether the address was found. auth-service
  // answers every request identically so the endpoint can't be used to
  // discover who is registered; a "no such user" here would give back exactly
  // what the API withholds.
  if (sent) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-[#2ec28a]/25 bg-[#2ec28a]/10 px-3 py-2.5 text-[13px] text-[#2ec28a]">
          <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
          <span>
            If an account exists for <strong>{email}</strong>, a reset link is on its way. Check
            your inbox, and your spam folder.
          </span>
        </div>

        {debugToken && (
          <div className="rounded-lg border border-[#f5a623]/25 bg-[#f5a623]/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#f5a623]">
              Development mode
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              No mail server is configured, so auth-service returned the token here instead of
              emailing it.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-2.5 h-9 w-full text-xs"
              onClick={() => onHasToken(debugToken)}
            >
              Continue to reset
            </Button>
          </div>
        )}

        <Button type="button" variant="outline" className="h-11 w-full text-sm" onClick={onBack}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        icon={Mail}
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        required
        autoFocus
      />

      <Button
        type="submit"
        className="h-11 w-full text-sm"
        disabled={submitting || !email.trim()}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send Reset Link"
        )}
      </Button>

      <Button type="button" variant="outline" className="h-11 w-full text-sm" onClick={onBack}>
        Back to sign in
      </Button>
    </form>
  );
}

export function ResetPasswordForm({
  token,
  onDone,
  setError,
}: {
  token: string;
  onDone: () => void;
  setError: (message: string | null) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [shown, setShown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await AuthApi.resetPassword(token, password);
      setDone(true);
      toast.success("Password updated");
    } catch (err) {
      // 400 carries a message distinguishing unknown / already-used / expired.
      // Surface it rather than collapsing all three into one string.
      const message = authErrorMessage(err, "That reset link could not be used.");
      setError(message);
      toast.error("Reset failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-[#2ec28a]/25 bg-[#2ec28a]/10 px-3 py-2.5 text-[13px] text-[#2ec28a]">
          <CheckCircle2 className="mt-px h-4 w-4 shrink-0" />
          <span>Your password has been updated. You can sign in with it now.</span>
        </div>
        <Button type="button" className="h-11 w-full text-sm" onClick={onDone}>
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        icon={Lock}
        label="New Password"
        type={shown ? "text" : "password"}
        placeholder="Your new password"
        value={password}
        onChange={setPassword}
        required
        autoFocus
        minLength={MIN_PASSWORD}
        hint={`At least ${MIN_PASSWORD} characters.`}
        trailing={<RevealButton shown={shown} onToggle={() => setShown((s) => !s)} />}
      />
      <Field
        icon={Lock}
        label="Confirm New Password"
        type={shown ? "text" : "password"}
        placeholder="Re-enter your new password"
        value={confirm}
        onChange={setConfirm}
        required
      />

      <Button type="submit" className="h-11 w-full text-sm" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating…
          </>
        ) : (
          "Reset Password"
        )}
      </Button>

      <Button type="button" variant="outline" className="h-11 w-full text-sm" onClick={onDone}>
        Back to sign in
      </Button>
    </form>
  );
}
