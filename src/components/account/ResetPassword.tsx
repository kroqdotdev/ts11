"use client";

import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button, Field, TextInput } from "@/components/ui/controls";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuthMessage } from "./messages";

const studioLink =
  "lofi-press inline-flex h-10 items-center rounded-[4px] border-2 border-card-ink bg-card px-4 text-sm font-semibold text-card-ink shadow-[3px_3px_0_var(--card-ink)]";

/** A short outcome: an icon, a heading that says what happened, and the way on. */
function Outcome({
  tone,
  title,
  children,
}: {
  tone: "problem" | "done";
  title: string;
  children: ReactNode;
}) {
  const t = useTranslations("account.resetPage");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        {tone === "problem" ? (
          <WarningIcon
            size={24}
            weight="bold"
            aria-hidden
            className="mt-0.5 shrink-0 text-danger"
          />
        ) : (
          <CheckCircleIcon
            size={24}
            weight="bold"
            aria-hidden
            className="mt-0.5 shrink-0 text-ink"
          />
        )}
        <div className="flex flex-col gap-2">
          <h1 className="font-signage text-[28px] leading-none text-ink">{title}</h1>
          <p className="text-sm leading-relaxed text-ink-soft">{children}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Link href="/studio" className={studioLink}>
          {t("studio")}
        </Link>
      </div>
    </div>
  );
}

/**
 * The page behind the reset link: choose a new password, or a plain explanation
 * when the link is incomplete or has expired.
 */
export function ResetPassword({
  token,
  linkError,
}: {
  token: string | null;
  linkError: string | null;
}) {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; field: "password" | "again" | "form" } | null>(
    null,
  );
  const [state, setState] = useState<"form" | "expired" | "done">(linkError ? "expired" : "form");
  const ids = { password: useId(), again: useId(), error: useId() };
  const t = useTranslations("account.resetPage");
  const { text, message } = useAuthMessage();

  if (state === "expired") {
    return (
      <Outcome tone="problem" title={t("expired")}>
        {t("howTo")}
      </Outcome>
    );
  }
  if (!token) {
    return (
      <Outcome tone="problem" title={t("incomplete")}>
        {t("howTo")}
      </Outcome>
    );
  }
  if (state === "done") {
    return (
      <Outcome tone="done" title={t("done")}>
        {t("doneBody")}
      </Outcome>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError({ text: text("tooShort"), field: "password" });
      return;
    }
    if (password !== again) {
      setError({ text: text("notSame"), field: "again" });
      return;
    }
    setError(null);
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setBusy(false);
    if (!error) {
      setState("done");
      return;
    }
    if (error.code === "INVALID_TOKEN" || error.code === "TOKEN_EXPIRED") {
      setState("expired");
      return;
    }
    const m = message(error);
    setError({ text: m.text, field: m.field === "password" ? "password" : "form" });
  }

  const alert = (field: "password" | "again" | "form") =>
    error?.field === field ? (
      <p id={ids.error} role="alert" className="text-[13px] leading-snug text-danger">
        {error.text}
      </p>
    ) : null;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="font-signage text-[28px] leading-none text-ink">{t("title")}</h1>
        <p className="text-sm leading-relaxed text-ink-soft">{t("intro")}</p>
      </div>
      <Field label={t("newPassword")} htmlFor={ids.password}>
        <TextInput
          id={ids.password}
          type="password"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error?.field === "password" || undefined}
          aria-describedby={error?.field === "password" ? ids.error : undefined}
          className={clsx(error?.field === "password" && "border-danger")}
        />
        {alert("password")}
      </Field>
      <Field label={t("again")} htmlFor={ids.again}>
        <TextInput
          id={ids.again}
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          aria-invalid={error?.field === "again" || undefined}
          aria-describedby={error?.field === "again" ? ids.error : undefined}
          className={clsx(error?.field === "again" && "border-danger")}
        />
        {alert("again")}
      </Field>
      {alert("form")}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
