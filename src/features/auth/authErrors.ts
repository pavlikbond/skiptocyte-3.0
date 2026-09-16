export type AuthErrorField = "email" | "password" | "root";

export type MappedAuthError = {
  field: AuthErrorField;
  message: string;
};

const AUTH_ERROR_MAP: Record<string, MappedAuthError> = {
  "auth/invalid-email": { field: "email", message: "Enter a valid email." },
  "auth/missing-email": { field: "email", message: "Enter your email." },
  "auth/email-already-in-use": {
    field: "email",
    message: "An account with this email already exists.",
  },
  "auth/user-disabled": { field: "email", message: "This account has been disabled." },
  "auth/user-not-found": { field: "password", message: "Incorrect email or password." },
  "auth/invalid-credential": { field: "password", message: "Incorrect email or password." },
  "auth/invalid-login-credentials": {
    field: "password",
    message: "Incorrect email or password.",
  },
  "auth/wrong-password": { field: "password", message: "Incorrect email or password." },
  "auth/missing-password": { field: "password", message: "Enter your password." },
  "auth/weak-password": {
    field: "password",
    message: "Password must be at least 6 characters.",
  },
  "auth/too-many-requests": {
    field: "root",
    message: "Too many attempts. Try again later.",
  },
  "auth/network-request-failed": {
    field: "root",
    message: "Network error. Check your connection and try again.",
  },
  "auth/popup-closed-by-user": { field: "root", message: "Google sign-in was cancelled." },
  "auth/cancelled-popup-request": {
    field: "root",
    message: "Google sign-in was cancelled.",
  },
  "auth/popup-blocked": {
    field: "root",
    message: "The sign-in popup was blocked. Allow popups and try again.",
  },
  "auth/account-exists-with-different-credential": {
    field: "email",
    message: "This email is already used with a different sign-in method.",
  },
  "auth/operation-not-allowed": {
    field: "root",
    message: "This sign-in method is not available.",
  },
  "auth/internal-error": { field: "root", message: "Something went wrong. Try again." },
};

const FALLBACK: MappedAuthError = {
  field: "root",
  message: "Something went wrong. Try again.",
};

function getErrorCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export function mapAuthError(err: unknown): MappedAuthError {
  const code = getErrorCode(err);
  if (code && AUTH_ERROR_MAP[code]) return AUTH_ERROR_MAP[code];
  return FALLBACK;
}
