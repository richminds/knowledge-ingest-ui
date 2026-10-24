import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSearch, Layers, Loader2, Lock, Mail, User, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
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
    icon: Layers,
    title: "Five Retrieval Modes",
    body: "Semantic, hybrid, graph and agentic search, compared side by side",
  },
  {
    icon: FileSearch,
    title: "Cited Answers",
    body: "Every answer links back to the passages it was built from",
  },
  {
    icon: Zap,
    title: "Instant Indexing",
    body: "Uploaded documents are searchable seconds after ingestion",
  },
];

// auth-service's RegisterRequest requires at least 6 characters.
const MIN_PASSWORD_LENGTH = 6;

export default function Register() {
  const [form, setForm] = useState({ email: "", fullName: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { register, user } = useAuth();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const result = await register({
      email: form.email,
      // `name`, not `full_name`: POST /auth/register takes auth-service's RegisterRequest.
      name: form.fullName.trim(),
      password: form.password,
    });
    setLoading(false);
    if (result.success) navigate("/login");
    else setError(result.error ?? "Registration failed");
  }

  return (
    <AuthScreen
      hero={
        <AuthHero
          heading="Get Started with"
          accent="Knowledge Ingest"
          blurb="Create an account to upload documents, inspect what's indexed, and test retrieval end to end."
          features={FEATURES}
        />
      }
    >
      <AuthCard title="Create Account" subtitle="Set up your account to get started">
        {error && <AuthAlert>{error}</AuthAlert>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            id="fullName"
            name="fullName"
            icon={User}
            label="Full Name"
            placeholder="Your full name"
            autoComplete="name"
            required
            value={form.fullName}
            onChange={set("fullName")}
          />
          <Field
            id="email"
            name="email"
            icon={Mail}
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={form.email}
            onChange={set("email")}
          />
          <Field
            id="password"
            name="password"
            icon={Lock}
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Choose a password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={form.password}
            onChange={set("password")}
            trailing={<RevealButton shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
          />
          <Field
            id="confirmPassword"
            name="confirmPassword"
            icon={Lock}
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            trailing={
              <RevealButton
                shown={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((s) => !s)}
              />
            }
          />
          <Button type="submit" className="h-11 w-full text-sm" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Account…
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
        <AuthDivider>Already have an account?</AuthDivider>
        <div className="text-center">
          <AuthLink onClick={() => navigate("/login")}>Sign In Instead</AuthLink>
        </div>
      </AuthCard>
    </AuthScreen>
  );
}
