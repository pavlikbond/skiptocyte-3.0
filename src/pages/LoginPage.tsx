import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mapAuthError } from "@/features/auth/authErrors";
import {
  loginSchema,
  signupSchema,
  type AuthFormValues,
} from "@/features/auth/authSchema";
import { useAuth } from "@/features/auth/AuthProvider";

/** Official Google "G" from Google Identity branding — keep the four brand fills. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const navigate = useNavigate();
  const [googleBusy, setGoogleBusy] = useState(false);
  const schema = mode === "signup" ? signupSchema : loginSchema;
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const busy = isSubmitting || googleBusy;
  const emailErrorId = "auth-email-error";
  const passwordErrorId = "auth-password-error";
  const passwordHintId = "auth-password-hint";
  const formErrorId = "auth-form-error";
  const passwordDescribedBy = [
    mode === "signup" ? passwordHintId : null,
    errors.password ? passwordErrorId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const applyServerError = (err: unknown) => {
    const mapped = mapAuthError(err);
    setError(mapped.field, { type: "server", message: mapped.message }, {
      shouldFocus: mapped.field !== "root",
    });
  };

  const onSubmit = async (values: AuthFormValues) => {
    try {
      if (mode === "login") await signInEmail(values.email, values.password);
      else await signUpEmail(values.email, values.password);
      void navigate("/differential");
    } catch (err) {
      applyServerError(err);
    }
  };

  const onGoogle = async () => {
    clearErrors();
    setGoogleBusy(true);
    try {
      await signInGoogle();
      void navigate("/differential");
    } catch (err) {
      applyServerError(err);
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "Sign in" : "Sign up"}</h1>
      <p className="text-sm text-muted-foreground">
        Counting works without an account. Sign in only to sync presets.
      </p>
      <form
        className="space-y-3"
        method="post"
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        aria-busy={busy}
        aria-describedby={errors.root ? formErrorId : undefined}
      >
        <div className="space-y-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? emailErrorId : undefined}
          />
          <FieldError id={emailErrorId} message={errors.email?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            disabled={busy}
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={passwordDescribedBy}
          />
          {mode === "signup" ? (
            <p id={passwordHintId} className="text-xs text-muted-foreground">
              At least 6 characters.
            </p>
          ) : null}
          <FieldError id={passwordErrorId} message={errors.password?.message} />
        </div>
        {errors.root?.message ? (
          <p id={formErrorId} className="text-sm text-destructive" role="alert">
            {errors.root.message}
          </p>
        ) : null}
        <Button className="w-full" type="submit" disabled={busy}>
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <Button className="w-full" type="button" variant="outline" disabled={busy} onClick={() => void onGoogle()}>
        <GoogleLogo />
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
