import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router";
import { Zap, Info } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const REASON_MESSAGES: Record<string, string> = {
  not_found:
    "Your email wasn't found in the team-1466 dashboard. Ask a team admin to add you there first.",
  inactive:
    "Your team-1466 account is inactive or alumni. Contact a team admin.",
  login_disabled:
    "Your login access is disabled in the team-1466 dashboard. Contact a team admin to re-enable it.",
  login_pending:
    "Your login access is pending approval. Contact a team admin.",
};

export default function SignInRoute() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const syncRole = useAction(api.users.syncRoleFromTeamDashboard);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("flow", "signIn");
    setLoading(true);
    setSyncWarning(null);
    try {
      await signIn("password", formData);
      // Sync role from team-1466 dashboard.
      const result = await syncRole();
      if (result.synced) {
        toast.success(
          `Signed in — role set to ${result.role} from team dashboard.`,
        );
      } else if (result.reason) {
        const msg =
          REASON_MESSAGES[result.reason] ??
          "Role not synced from team dashboard.";
        setSyncWarning(msg);
        toast.warning(msg, { duration: 8000 });
      }
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" /> WebbPower
          </CardTitle>
          <CardDescription>
            Sign in with your{" "}
            <span className="font-medium text-foreground">team-1466</span>{" "}
            email and password. Access is managed by the team dashboard.
          </CardDescription>
        </CardHeader>

        {syncWarning && (
          <div className="px-6 pb-2">
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertDescription>{syncWarning}</AlertDescription>
            </Alert>
          </div>
        )}

        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@team1466.org"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              Sign in
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Don't have access?{" "}
              <a
                href={import.meta.env.VITE_TEAM_DASHBOARD_URL ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Request it in the team dashboard
              </a>
              .
            </p>

            <Separator className="my-2" />

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await signIn("anonymous");
                  navigate("/");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Failed",
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue as guest (read-only)
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
