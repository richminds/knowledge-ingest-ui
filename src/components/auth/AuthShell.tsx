import type { ComponentType, ReactNode } from "react";
import { AlertCircle, BrainCircuit, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// The pieces every auth page is built from, mirroring makemerich-frontend's
// components/auth/AuthShell.js (AuthScreen, AuthHero, AuthCard, AuthAlert,
// AuthDivider): gradient backdrop with floating circles, a marketing panel on
// desktop, and an elevated form card. Rebuilt in Tailwind because this app
// has no MUI.

export interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

/** Full-page gradient backdrop; `hero` is the desktop-only left panel. */
export function AuthScreen({ hero, children }: { hero?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#312e81_0%,#6366f1_55%,#8b5cf6_100%)]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 animate-float" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-white/5 animate-float-reverse" />
      <div
        className={cn(
          "relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10",
          hero && "lg:grid-cols-2"
        )}
      >
        {hero}
        <div className="mx-auto w-full max-w-[500px] animate-slide-up">{children}</div>
      </div>
    </div>
  );
}

export function AuthHero({
  heading,
  accent,
  blurb,
  features,
}: {
  heading: string;
  accent: string;
  blurb: string;
  features: Feature[];
}) {
  return (
    <div className="hidden text-white animate-fade-in-slow lg:block lg:pr-6">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/95 shadow-[0_14px_36px_rgba(0,0,0,0.35)]">
        <BrainCircuit className="h-11 w-11 text-[#6366f1]" />
      </div>
      <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight">
        {heading}
        <span className="block text-[#c4b5fd]">{accent}</span>
      </h1>
      <p className="mb-8 max-w-lg text-base leading-relaxed text-white/90">{blurb}</p>
      <div className="space-y-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="mb-1 flex items-center gap-2.5">
              <Icon className="h-5 w-5 shrink-0 text-[#2ec28a]" />
              <span className="text-base font-semibold text-white">{title}</span>
            </div>
            <p className="text-sm text-white/80">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthCard({
  eyebrow = "Knowledge Ingest",
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/20 bg-card/95 p-6 text-card-foreground shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] shadow-[0_16px_40px_rgba(99,102,241,0.45)]">
          <BrainCircuit className="h-9 w-9 text-white" />
        </div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function AuthAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success";
  children: ReactNode;
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px]",
        tone === "success"
          ? "border-[#2ec28a]/25 bg-[#2ec28a]/10 text-[#1f9e6e] dark:text-[#2ec28a]"
          : "border-[#ff5d6c]/25 bg-[#ff5d6c]/10 text-[#ff5d6c]"
      )}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-2 text-[11px] text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}

/** Text-style link button used for in-card navigation. */
export function AuthLink({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("text-sm font-semibold text-primary transition-colors hover:underline", className)}
    >
      {children}
    </button>
  );
}
