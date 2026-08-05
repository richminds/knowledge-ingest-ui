import { useState } from "react";
import { toast } from "sonner";
import { Loader2, UserRoundCog, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { authErrorMessage } from "@/api/authClient";
import { Button } from "@/components/ui/button";

// Shown while the signed-in user is still on the shared Guest organization
// (auth-service's register() default when no org_id is given — see
// GUEST_ORG_ID) or, for an older account, has no org_id at all. Lets them
// move to a real organization via the self-service join endpoint
// (POST /auth/me/organization) instead of needing a staff admin.
export function GuestBanner() {
  const { joinOrganization } = useAuth();
  const [orgId, setOrgId] = useState("");
  const [joining, setJoining] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleJoin() {
    if (!orgId.trim()) return;
    setJoining(true);
    try {
      await joinOrganization(orgId.trim());
      toast.success("Joined organization");
    } catch (err) {
      toast.error("Could not join organization", {
        description: authErrorMessage(err, "Check the organization ID and try again."),
      });
    } finally {
      setJoining(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 rounded-xl border border-[#f5a623]/30 bg-[#f5a623]/10 text-xs">
      <UserRoundCog className="w-4 h-4 text-[#f5a623] shrink-0" />
      <span className="text-muted-foreground">
        You're on the shared <span className="font-semibold text-foreground">Guest</span>{" "}
        organization — join a specific one below.
      </span>
      <div className="flex items-center gap-1.5 ml-auto">
        <input
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="Organization ID"
          className="h-7 w-40 rounded-md border border-border bg-background px-2 text-[11px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-[11px]"
          disabled={!orgId.trim() || joining}
          onClick={handleJoin}
        >
          {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join"}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
