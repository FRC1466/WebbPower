import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router";
import { Zap } from "lucide-react";
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
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function SignInRoute() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" /> WebbPower
          </CardTitle>
          <CardDescription>
            {mode === "signIn"
              ? "Sign in to access the dashboard"
              : "Create a team account"}
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            formData.set("flow", mode);
            setLoading(true);
            try {
              await signIn("password", formData);
              navigate("/");
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Sign in failed",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "signIn" ? "current-password" : "new-password"
                }
                required
                minLength={8}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "signIn" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() =>
                setMode(mode === "signIn" ? "signUp" : "signIn")
              }
            >
              {mode === "signIn"
                ? "Need an account? Create one"
                : "Already have an account? Sign in"}
            </button>
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
