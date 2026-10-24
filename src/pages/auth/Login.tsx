import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth, LOGOUT_REASON_KEY } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Field, RevealButton } from "@/components/ui/field";
import {
  AuthAlert,
  AuthCard,
  AuthDivider,
  AuthHero,
  AuthLink,
  AuthScreen,
  type Feature,
} from "@/components/auth/AuthShell";

const FEATURES: Feature[] = [
  {
    icon: Database,
    title: "Document Ingestion",
    body: "Upload PDFs, Office files and text straight into the knowledge base",
  },
  {
    icon: Sparkles,
    title: "Retrieval Testing",
    body: "Ask questions and see exactly which passages the answer came from",
  },
  {
    icon: ShieldCheck,
    title: "Access Controlled",
    body: "Every answer only uses documents you are allowed to see",
  },
];

// Why the last session ended, set by lib/session.ts / lib/auth.tsx; shown once.
const LOGOUT_MESSAGES: Record<string, string> = {
  idle: "You were signed out after 5 minutes of inactivity. Please sign in again.",
  expired: "Your session has expired. Please sign in again.",
};
const logoutMessage = () => LOGOUT_MESSAGES[sessionStorage.getItem(LOGOUT_REASON_KEY) ?? ""] || "";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(logoutMessage);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    sessionStorage.removeItem(LOGOUT_REASON_KEY);
  }, []);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    if (result.success) navigate("/");
    else setError(result.error ?? "Login failed. Please try again.");
    setLoading(false);
  }

  return (
    <AuthScreen
      hero={
        <AuthHero
          heading="Welcome Back to"
          accent="Knowledge Ingest"
          blurb="Pick up where you left off: upload new documents, inspect what's indexed, and test retrieval end to end."
          features={FEATURES}
        />
      }
    >
      <AuthCard title="Welcome Back" subtitle="Sign in to access your ingestion console">
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
            value={email}
            onChange={setEmail}
          />
          <Field
            id="password"
            name="password"
            icon={Lock}
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Your password"
            autoComplete="current-password"
            required
            value={password}
            onChange={setPassword}
            trailing={<RevealButton shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
          />
          <div className="flex justify-end">
            <AuthLink onClick={() => navigate("/forgot-password")} className="text-[13px]">
              Forgot password?
            </AuthLink>
          </div>
          <Button type="submit" className="h-11 w-full text-sm" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing In…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
        <AuthDivider>New to Knowledge Ingest?</AuthDivider>
        <div className="text-center">
          <AuthLink onClick={() => navigate("/register")}>Create Your Account</AuthLink>
        </div>
      </AuthCard>
    </AuthScreen>
  );
}
