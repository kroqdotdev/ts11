import { useFormatter, useTranslations } from "next-intl";
import { useCallback } from "react";
import { APP_NAME } from "@/lib/brand";

/** Errors as Better Auth's client returns them. */
export interface AuthError {
  code?: string;
  message?: string;
  status?: number;
}

export type ErrorField = "email" | "password" | "form";

/** A message key under `account.errors`. */
export type AuthErrorKey =
  | "generic"
  | "rateLimited"
  | "mismatch"
  | "invalidEmail"
  | "exists"
  | "tooShort"
  | "tooLong"
  | "compromised"
  | "wrongPassword"
  | "notFresh"
  | "linkExpired"
  | "alreadyVerified"
  | "offline"
  | "enterEmail"
  | "enterPassword"
  | "notSame";

/**
 * Better Auth's error codes as message keys, and the field each one belongs under.
 * Anything unknown gets a calm general line instead of the raw message.
 */
export function authError(error: AuthError | null | undefined): {
  key: AuthErrorKey;
  field: ErrorField;
} {
  if (!error) return { key: "generic", field: "form" };
  if (error.status === 429) return { key: "rateLimited", field: "form" };
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return { key: "mismatch", field: "password" };
    case "INVALID_EMAIL":
      return { key: "invalidEmail", field: "email" };
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return { key: "exists", field: "email" };
    case "PASSWORD_TOO_SHORT":
      return { key: "tooShort", field: "password" };
    case "PASSWORD_TOO_LONG":
      return { key: "tooLong", field: "password" };
    case "PASSWORD_COMPROMISED":
      return { key: "compromised", field: "password" };
    case "INVALID_PASSWORD":
      return { key: "wrongPassword", field: "password" };
    case "SESSION_EXPIRED":
    case "SESSION_NOT_FRESH":
      return { key: "notFresh", field: "form" };
    case "INVALID_TOKEN":
    case "TOKEN_EXPIRED":
      return { key: "linkExpired", field: "form" };
    case "EMAIL_ALREADY_VERIFIED":
      return { key: "alreadyVerified", field: "form" };
  }
  if (error.status === undefined || error.status === 0) return { key: "offline", field: "form" };
  return { key: "generic", field: "form" };
}

/** Turns a Better Auth error (or one of our own keys) into words in the page's language. */
export function useAuthMessage() {
  const t = useTranslations("account.errors");
  const text = useCallback((key: AuthErrorKey) => t(key, { app: APP_NAME }), [t]);
  const message = useCallback(
    (error: AuthError | null | undefined) => {
      const { key, field } = authError(error);
      return { text: text(key), field };
    },
    [text],
  );
  return { text, message };
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

/** Formats bytes with the page's decimal comma or point: "2.5 MB", "2,5 MB". */
export function useFormatBytes() {
  const format = useFormatter();
  return useCallback(
    (bytes: number) => {
      const { value, unit, digits } = sizeParts(bytes);
      const n = format.number(value, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
      return `${n} ${unit}`;
    },
    [format],
  );
}
