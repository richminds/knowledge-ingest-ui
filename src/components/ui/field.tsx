import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The labelled, icon-adorned input used across every auth form.
 *
 * Shared by every auth page (src/pages/auth), the same role AuthField plays
 * in makemerich-frontend.
 */
export function Field({
  icon: Icon,
  label,
  value,
  onChange,
  trailing,
  hint,
  className,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  trailing?: React.ReactNode;
  hint?: string;
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
        {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {hint && <p className="mt-1.5 pl-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Show/hide toggle for a password field. */
export function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
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
