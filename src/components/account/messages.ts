/** Errors as Better Auth's client returns them. */
export interface AuthError {
  code?: string;
  message?: string;
  status?: number;
}

export type ErrorField = "email" | "password" | "form";

/**
 * Better Auth's error codes in plain words, and the field each one belongs under.
 * Anything unknown gets a calm general line instead of the raw message.
 */
export function authMessage(error: AuthError | null | undefined): {
  text: string;
  field: ErrorField;
} {
  if (!error) return { text: "That didn't work. Try again in a moment.", field: "form" };
  if (error.status === 429) return { text: "Too many tries. Wait a few minutes.", field: "form" };
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return {
        text: "That email and password don't match. Check them, or reset your password.",
        field: "password",
      };
    case "INVALID_EMAIL":
      return { text: "That doesn't look like an email address.", field: "email" };
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        text: "There's already an account with that email. Sign in instead.",
        field: "email",
      };
    case "PASSWORD_TOO_SHORT":
      return { text: "Use at least 8 characters.", field: "password" };
    case "PASSWORD_TOO_LONG":
      return { text: "Use 128 characters or fewer.", field: "password" };
    case "PASSWORD_COMPROMISED":
      return {
        text: "That password has shown up in a data leak. Pick a different one.",
        field: "password",
      };
    case "INVALID_PASSWORD":
      return { text: "That password isn't right.", field: "password" };
    case "SESSION_EXPIRED":
    case "SESSION_NOT_FRESH":
      return {
        text: "For your safety, sign out and sign in again first. Then you have a day to do this.",
        field: "form",
      };
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return { text: "This link has expired.", field: "form" };
    case "EMAIL_ALREADY_VERIFIED":
      return { text: "Your email is already confirmed.", field: "form" };
  }
  if (error.status === undefined || error.status === 0) {
    return {
      text: "Couldn't reach teamsheet11. Check your connection and try again.",
      field: "form",
    };
  }
  return { text: "That didn't work. Try again in a moment.", field: "form" };
}

/** A rough check before asking the server; the server has the final say. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Bytes as people read them on this page: whole KB below a megabyte, then MB. Anything
 * stored shows as at least 1 KB, so a small image never reads as taking no space.
 */
export function sizeParts(bytes: number): { value: number; unit: "KB" | "MB"; digits: number } {
  if (bytes < 1024 * 1024) {
    return { value: bytes > 0 ? Math.max(1, Math.round(bytes / 1024)) : 0, unit: "KB", digits: 0 };
  }
  const mb = bytes / 1024 / 1024;
  return { value: mb, unit: "MB", digits: mb < 10 ? 1 : 0 };
}

export function formatBytes(bytes: number): string {
  const { value, unit, digits } = sizeParts(bytes);
  return `${value.toFixed(digits)} ${unit}`;
}
