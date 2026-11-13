"use client";

import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Button, inputClass } from "@/components/ui/controls";
import { authClient } from "@/lib/auth-client";

function PasswordInput({
  label,
  value,
  onChange,
  error,
  hint,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        autoFocus={autoFocus}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : undefined}
      />
      {error ? (
        <p id={`${id}-e`} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-ink-soft">{hint}</p>
      )}
    </div>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-4" role="alert">
      <div className="flex items-start gap-3">
        <WarningIcon size={24} weight="bold" className="mt-0.5 shrink-0 text-danger" />
        <div className="flex flex-col gap-1.5">
          <h1 className="font-signage text-[28px] leading-none">{title}</h1>
          <p className="text-sm leading-relaxed text-ink-soft">{body}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Link
          href="/studio"
          className="inline-flex h-10 lofi-press items-center rounded-[4px] border-2 border-card-ink bg-card px-4 text-sm font-semibold text-card-ink shadow-[3px_3px_0_var(--card-ink)]"
        >
          Go to the studio
        </Link>
      </div>
    </div>
  );
}

/** Sets a new password from the link in the reset email. */
export function ResetPassword() {
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<{
    field: "password" | "confirm" | "form";
    text: string;
  } | null>(null);

  if (linkError || !token) {
    return (
      <Problem
        title={linkError ? "This link has expired" : "This link is incomplete"}
        body="Reset links work once, for one hour. In the studio, choose Sign in, then Forgot your password, to get a new one."
      />
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <div className="flex items-start gap-3">
          <CheckCircleIcon size={24} weight="bold" className="mt-0.5 shrink-0 text-grass" />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-signage text-[28px] leading-none">Password changed</h1>
            <p className="text-sm leading-relaxed text-ink-soft">
              Sign in with your new password. For safety you&apos;re signed out on every device.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Link
            href="/studio"
            className="inline-flex h-10 lofi-press items-center rounded-[4px] border-2 border-card-ink bg-card px-4 text-sm font-semibold text-card-ink shadow-[3px_3px_0_var(--card-ink)]"
          >
            Go to the studio
          </Link>
        </div>
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError({ field: "password", text: "Use at least 8 characters for your password." });
      return;
    }
    if (password !== confirm) {
      setError({ field: "confirm", text: "The two passwords don't match." });
      return;
    }
    setBusy(true);
    setError(null);
    const res = await authClient.resetPassword({ newPassword: password, token: token! });
    setBusy(false);
    if (res.error) {
      const text =
        res.error.status === 429
          ? "Too many tries. Wait a few minutes."
          : res.error.code === "INVALID_TOKEN"
            ? "This link has expired. Ask for a new one from the sign-in window."
            : res.error.message || "Something went wrong. Try again.";
      setError({ field: "form", text });
      return;
    }
    setDone(true);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-signage text-[28px] leading-none">Choose a new password</h1>
        <p className="text-sm leading-relaxed text-ink-soft">
          Pick something you don&apos;t use elsewhere. At least 8 characters.
        </p>
      </div>
      <PasswordInput
        label="New password"
        value={password}
        onChange={setPassword}
        autoFocus
        error={error?.field === "password" ? error.text : undefined}
      />
      <PasswordInput
        label="Type it again"
        value={confirm}
        onChange={setConfirm}
        error={error?.field === "confirm" ? error.text : undefined}
      />
      {error?.field === "form" && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error.text}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={busy || !password || !confirm}>
          {busy ? "Saving…" : "Save new password"}
        </Button>
      </div>
    </form>
  );
}
