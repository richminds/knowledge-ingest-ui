import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { AuthAlert, AuthCard, AuthDivider, AuthLink, AuthScreen } from "@/components/auth/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await forgotPassword(email);
    if (result.success) setSubmitted(true);
    else setError(result.error ?? "Something went wrong. Please try again.");
    setLoading(false);
  }

  return (
    <AuthScreen>
      <AuthCard
        title="Forgot Password?"
        subtitle="No worries: enter your registered email and we'll send you a reset link."
      >
        {submitted ? (
          <div className="animate-fade-in-slow">
            {/* The same confirmation whether or not the address is registered. */}
            <AuthAlert tone="success">
              If an account exists for <b>{email}</b>, a password reset link has been sent. Please
              check your inbox (and spam folder).
            </AuthAlert>
            <Button className="h-11 w-full text-sm" onClick={() => navigate("/login")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </div>
        ) : (
          <>
            {error && <AuthAlert>{error}</AuthAlert>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                id="email"
                name="email"
                icon={Mail}
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={setEmail}
              />
              <Button type="submit" className="h-11 w-full text-sm" disabled={loading || !email}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Reset Link…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
            <AuthDivider>Remembered your password?</AuthDivider>
            <div className="text-center">
              <AuthLink onClick={() => navigate("/login")}>Back to Sign In</AuthLink>
            </div>
          </>
        )}
      </AuthCard>
    </AuthScreen>
  );
}
