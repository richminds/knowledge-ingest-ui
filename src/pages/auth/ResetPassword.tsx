import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field, RevealButton } from "@/components/ui/field";
import { AuthAlert, AuthCard, AuthDivider, AuthLink, AuthScreen } from "@/components/auth/AuthShell";

// auth-service's reset requires at least 6 characters, as registration does.
const MIN_PASSWORD_LENGTH = 6;

// Reached from the emailed link: auth-service builds it as
// <app>/reset-password?token=... (features/password_reset.py). Not behind
// ProtectedRoute: a signed-in user may well be the one resetting.
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      // replace: Back must not return to a link the server has marked used.
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } else {
      setError(result.error ?? "Password reset failed");
    }
  }

  return (
    <AuthScreen>
      <AuthCard title="Reset Your Password" subtitle="Choose a new password for your account.">
        {!token ? (
          <AuthAlert>
            This reset link is invalid or incomplete. Please request a new one from the{" "}
            <AuthLink onClick={() => navigate("/forgot-password")} className="text-[13px]">
              Forgot Password
            </AuthLink>{" "}
            page.
          </AuthAlert>
        ) : success ? (
          <AuthAlert tone="success">
            Your password has been reset. Redirecting you to sign in…
          </AuthAlert>
        ) : (
          <>
            {error && <AuthAlert>{error}</AuthAlert>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                id="password"
                name="password"
                icon={Lock}
                label="New Password"
                type={showPassword ? "text" : "password"}
                placeholder="Choose a new password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
                value={password}
                onChange={setPassword}
                trailing={<RevealButton shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
              />
              <Field
                id="confirmPassword"
                name="confirmPassword"
                icon={Lock}
                label="Confirm New Password"
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter the new password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={setConfirmPassword}
                trailing={<RevealButton shown={showConfirm} onToggle={() => setShowConfirm((s) => !s)} />}
              />
              <Button type="submit" className="h-11 w-full text-sm" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              This link works once. Request another if it has expired.
            </p>
          </>
        )}
        <AuthDivider>Remembered your password?</AuthDivider>
        <div className="text-center">
          <AuthLink onClick={() => navigate("/login")}>Back to Sign In</AuthLink>
        </div>
      </AuthCard>
    </AuthScreen>
  );
}
