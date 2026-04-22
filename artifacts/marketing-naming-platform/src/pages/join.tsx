import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAcceptInvite, type ErrorType } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Join() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { mutate, isPending } = useAcceptInvite({
    mutation: {
      onSuccess(data) {
        login(data.token);
        setLocation("/generator");
      },
      onError(err: ErrorType<unknown>) {
        const data = err.data as Record<string, string> | null;
        const msg = data?.error ?? err.message ?? "Failed to accept invite";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  useEffect(() => {
    if (!token) {
      toast({ title: "Invalid invite", description: "No invite token found in this link.", variant: "destructive" });
    }
  }, [token]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    mutate({ data: { token, email, password } });
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-mono font-bold text-lg">
            N
          </div>
          <CardTitle className="text-2xl">Join the team</CardTitle>
          <CardDescription>You've been invited — create your account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <p className="text-sm text-destructive text-center">
              This invite link appears to be invalid. Please ask your team owner for a new one.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending || !token}>
                {isPending ? "Joining…" : "Join team"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
