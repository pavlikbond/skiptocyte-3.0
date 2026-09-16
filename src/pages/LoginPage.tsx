import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/AuthProvider";

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await signInEmail(email, password);
      else await signUpEmail(email, password);
      void navigate("/differential");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "Sign in" : "Sign up"}</h1>
      <p className="text-sm text-muted-foreground">
        Counting works without an account. Sign in only to sync presets.
      </p>
      <form className="space-y-3" onSubmit={(e) => void submit(e)}>
        <div>
          <Label>Email</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={busy}>
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <Button
        className="w-full"
        variant="outline"
        onClick={() => {
          void signInGoogle()
            .then(() => navigate("/differential"))
            .catch((err: unknown) =>
              setError(err instanceof Error ? err.message : "Google sign-in failed"),
            );
        }}
      >
        Continue with Google
      </Button>
      {mode === "login" ? (
        <p className="text-sm">
          Need an account? <Link className="underline" to="/signup">Sign up</Link>
        </p>
      ) : (
        <p className="text-sm">
          Already have one? <Link className="underline" to="/login">Sign in</Link>
        </p>
      )}
    </Card>
  );
}

export function LoginPage() {
  return <AuthForm mode="login" />;
}

export function SignupPage() {
  return <AuthForm mode="signup" />;
}
