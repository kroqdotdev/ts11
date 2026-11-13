"use client";

import { EnvelopeSimpleIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { create } from "zustand";
import { Button, Dialog, inputClass } from "@/components/ui/controls";
import { authClient } from "@/lib/auth-client";

export type AuthMode = "signin" | "signup" | "reset" | "sent";

/** Lets any button in the app open the one sign-in dialog. */
export const useAuthDialog = create<{
  open: boolean;
  mode: AuthMode;
  email: string;
  show: (mode?: AuthMode) => void;
  set: (patch: Partial<{ open: boolean; mode: AuthMode; email: string }>) => void;
}>()((set) => ({
  open: false,
  mode: "signin",
  email: "",
  show: (mode = "signin") => set({ open: true, mode }),
  set: (patch) => set(patch),
}));

const TITLES: Record<AuthMode, string> = {
  signin: "Sign in",
  signup: "Create account",
  reset: "Reset password",
  sent: "Check your inbox",
};

const VERIFIED_URL = "/studio?verified=1";

/** Better Auth error codes and statuses, in plain words. */
function friendly(error: { code?: string; status?: number; message?: string } | null): string {
  if (!error) return "Something went wrong. Try again.";
  if (error.status === 429) return "Too many tries. Wait a few minutes.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "That email and password don't match. Check them, or reset your password.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There's already an account with that email. Sign in instead.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 8 characters for your password.";
    case "PASSWORD_TOO_LONG":
      return "That password is too long. Use 128 characters or fewer.";
    case "INVALID_EMAIL":
      return "That doesn't look like an email address.";
    default:
      if (error.status && error.status >= 500)
        return "The server had a problem. Try again in a moment.";
      return error.message || "Something went wrong. Try again.";
  }
}

/** A 30-second cooldown for "send again" buttons. */
export function useCooldown(seconds = 30) {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= now) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [until, now]);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return {
    left,
    start: () => {
      const t = Date.now();
      setNow(t);
      setUntil(t + seconds * 1000);
    },
  };
}

function Input({
  label,
  error,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = useId();
  const errId = `${id}-err`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        {...rest}
      />
      {error ? (
        <p id={errId} className="text-xs leading-snug font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs leading-snug text-ink-soft">{hint}</p>
      )}
    </div>
  );
}

function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold text-ink-soft">
      <span aria-hidden className="h-0.5 flex-1 bg-rule" />
      {children}
      <span aria-hidden className="h-0.5 flex-1 bg-rule" />
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="secondary"
        className="h-11 w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const res = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/studio?signedin=1",
          });
          if (res.error) {
            setBusy(false);
            setError(friendly(res.error));
          }
        }}
      >
        <GoogleLogoIcon size={18} weight="bold" />
        {busy ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function SignInForm() {
  const { email, set } = useAuthDialog();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: "email" | "password" | "form"; text: string } | null>(
    null,
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (res.error) {
      const text = friendly(res.error);
      setError({ field: res.error.code === "INVALID_EMAIL" ? "email" : "password", text });
      return;
    }
    set({ open: false });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => set({ email: e.target.value })}
        error={error?.field === "email" ? error.text : undefined}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error?.field === "password" ? error.text : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => set({ mode: "reset" })}
          className="text-sm font-medium text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink"
        >
          Forgot your password?
        </button>
        <Button type="submit" variant="primary" disabled={busy || !email || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}

function SignUpForm() {
  const { email, set } = useAuthDialog();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: "email" | "password"; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError({ field: "password", text: "Use at least 8 characters for your password." });
      return;
    }
    setBusy(true);
    setError(null);
    const address = email.trim();
    const res = await authClient.signUp.email({
      email: address,
      password,
      name: name.trim() || address.split("@")[0] || "Coach",
      callbackURL: VERIFIED_URL,
    });
    setBusy(false);
    if (res.error) {
      const code = res.error.code ?? "";
      setError({
        field: code.startsWith("PASSWORD") ? "password" : "email",
        text: friendly(res.error),
      });
      return;
    }
    set({ mode: "sent", email: address });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Your name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        hint="Optional. Only used in emails to you."
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => set({ email: e.target.value })}
        error={error?.field === "email" ? error.text : undefined}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error?.field === "password" ? error.text : undefined}
        hint="At least 8 characters."
      />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={busy || !email || !password}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </div>
    </form>
  );
}

function ResetForm() {
  const { email, set } = useAuthDialog();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });
    setBusy(false);
    // Only a rate limit or a broken request is worth showing; never whether the
    // address has an account.
    if (res.error && (res.error.status === 429 || res.error.code === "INVALID_EMAIL")) {
      setError(friendly(res.error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p className="text-sm leading-relaxed text-ink">
          If there&apos;s an account for <strong>{email.trim()}</strong>, we&apos;ve sent a link to
          set a new password. It works for one hour.
        </p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => set({ mode: "signin" })}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm leading-relaxed text-ink-soft">
        Enter the email you signed up with and we&apos;ll send a link to choose a new password.
      </p>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => set({ email: e.target.value })}
        error={error || undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => set({ mode: "signin" })}
          className="text-sm font-medium text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink"
        >
          Back to sign in
        </button>
        <Button type="submit" variant="primary" disabled={busy || !email}>
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </div>
    </form>
  );
}

/** The resend button used after sign-up and in the verify banner. */
export function ResendButton({
  email,
  size = "md",
  variant = "secondary",
}: {
  email: string;
  size?: "sm" | "md";
  variant?: "secondary" | "primary";
}) {
  const { left, start } = useCooldown(30);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        size={size}
        variant={variant}
        disabled={state === "busy" || left > 0}
        onClick={async () => {
          setState("busy");
          const res = await authClient.sendVerificationEmail({ email, callbackURL: VERIFIED_URL });
          if (res.error) {
            setState("error");
            setError(friendly(res.error));
          } else {
            setState("sent");
            start();
          }
        }}
      >
        {state === "busy"
          ? "Sending…"
          : left > 0
            ? `Sent. Again in ${left}s`
            : "Send the link again"}
      </Button>
      {state === "error" && <span className="text-xs font-medium text-danger">{error}</span>}
    </span>
  );
}

function Sent() {
  const { email, set } = useAuthDialog();
  return (
    <div className="flex flex-col gap-4" role="status">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center border-2 border-card-ink bg-card text-card-ink shadow-[3px_3px_0_var(--card-ink)]"
        >
          <EnvelopeSimpleIcon size={20} weight="bold" />
        </span>
        <p className="text-sm leading-relaxed text-ink">
          We sent a link to <strong className="break-all">{email}</strong>. Open it to confirm your
          email. Your clubs start saving to your account after that.
        </p>
      </div>
      <p className="text-xs leading-relaxed text-ink-soft">
        You&apos;re signed in already, so you can keep working. Nothing in this browser is lost.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResendButton email={email} />
        <Button variant="primary" onClick={() => set({ open: false })}>
          Back to the studio
        </Button>
      </div>
    </div>
  );
}

/** The sign-in dialog. Render once per page; open it with `useAuthDialog().show()`. */
export function AuthDialog() {
  const { open, mode, set } = useAuthDialog();
  const intro =
    mode === "signin" || mode === "signup"
      ? "Save your clubs to an account and open them on any device. Everything still works without one."
      : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) =>
        set({ open: o, ...(o ? {} : { mode: mode === "sent" ? "signin" : mode }) })
      }
      title={TITLES[mode]}
      description={intro}
    >
      {(mode === "signin" || mode === "signup") && (
        <div className="flex flex-col gap-5">
          <div
            role="group"
            aria-label="Sign in or create an account"
            className="grid grid-cols-2 gap-1 rounded-[4px] border-2 border-ink/20 bg-well p-1"
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => set({ mode: m })}
                className="h-9 rounded-[3px] text-sm font-semibold text-ink-soft transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-paper"
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <GoogleButton />
          <Divider>or with email</Divider>
          {mode === "signin" ? <SignInForm /> : <SignUpForm />}
        </div>
      )}
      {mode === "reset" && <ResetForm />}
      {mode === "sent" && <Sent />}
    </Dialog>
  );
}
