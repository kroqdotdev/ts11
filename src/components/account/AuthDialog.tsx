"use client";

import { EnvelopeSimpleIcon, GoogleLogoIcon, SignInIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { Button, Dialog, Field, Segmented, TextInput } from "@/components/ui/controls";
import { getPathname, Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { APP_NAME } from "@/lib/brand";
import { useAuthDialog, type AuthMode } from "./authDialogStore";
import { EmailText } from "./EmailText";
import { looksLikeEmail, useAuthMessage, type ErrorField } from "./messages";

export { useAuthDialog };
export type { AuthMode };

const COOLDOWN_MS = 30_000;

/**
 * Where Better Auth sends people after the confirmation link, in the language of the
 * page that asked. The server also reads the language from this link to write the
 * email in it (see src/server/mail-templates.ts).
 */
const verifiedUrl = (locale: Locale) =>
  getPathname({ href: { pathname: "/studio", query: { verified: "1" } }, locale });

/**
 * The one sign-in dialog: sign in, create an account, ask for a reset link, and
 * "check your inbox" after signing up. It sits over whatever screen opened it.
 */
export function AuthDialog() {
  const open = useAuthDialog((s) => s.open);
  const mode = useAuthDialog((s) => s.mode);
  const set = useAuthDialog((s) => s.set);
  const t = useTranslations("account.dialog");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => set({ open: o })}
      title={t(`title.${mode}`)}
      description={
        mode === "signin" || mode === "signup" ? t("intro", { app: APP_NAME }) : undefined
      }
    >
      {mode === "signin" || mode === "signup" ? (
        <CredentialsForm mode={mode} />
      ) : mode === "reset" ? (
        <ResetRequest />
      ) : (
        <CheckInbox />
      )}
    </Dialog>
  );
}

/** Sign in and create account: Google first, then email. */
function CredentialsForm({ mode }: { mode: "signin" | "signup" }) {
  const email = useAuthDialog((s) => s.email);
  const set = useAuthDialog((s) => s.set);
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("account.dialog");
  const { text, message } = useAuthMessage();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<{ text: string; field: ErrorField } | null>(null);
  const ids = { name: useId(), email: useId(), password: useId(), error: useId() };
  const signup = mode === "signup";

  async function google() {
    setError(null);
    setBusy("google");
    // Back to where they were, in the same language; the studio shows a "signed in" note.
    const back =
      pathname === "/account"
        ? getPathname({ href: "/account", locale })
        : getPathname({ href: { pathname: "/studio", query: { signedin: "1" } }, locale });
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: back,
      errorCallbackURL: getPathname({
        href: { pathname: pathname || "/", query: { signinerror: "1" } },
        locale,
      }),
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setBusy(null);
      setError(message(error));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!looksLikeEmail(address)) {
      setError({ text: text("enterEmail"), field: "email" });
      return;
    }
    if (signup && password.length < 8) {
      setError({ text: text("tooShort"), field: "password" });
      return;
    }
    if (!password) {
      setError({ text: text("enterPassword"), field: "password" });
      return;
    }
    setError(null);
    setBusy("email");
    const { error } = signup
      ? await authClient.signUp.email({
          email: address,
          password,
          name: name.trim(),
          callbackURL: verifiedUrl(locale),
        })
      : await authClient.signIn.email({ email: address, password });
    setBusy(null);
    if (error) {
      setError(message(error));
      return;
    }
    if (signup) {
      useResend.getState().start(address);
      set({ mode: "sent", email: address });
      return;
    }
    set({ open: false });
    toast(t("signedIn"), { description: address });
  }

  const errorFor = (field: ErrorField) =>
    error?.field === field ? (
      <p id={ids.error} role="alert" className="text-[13px] leading-snug text-danger">
        {error.text}
      </p>
    ) : null;
  const described = (field: ErrorField) => (error?.field === field ? ids.error : undefined);

  return (
    <div className="flex flex-col gap-5">
      <Segmented
        label={t("modeLabel")}
        value={mode}
        onChange={(m) => {
          setError(null);
          set({ mode: m });
        }}
        options={[
          { value: "signin", label: t("signin") },
          { value: "signup", label: t("signup") },
        ]}
      />

      <Button onClick={google} disabled={busy !== null} className="w-full">
        <GoogleLogoIcon size={18} weight="bold" aria-hidden />
        {busy === "google" ? t("googleBusy") : t("google")}
      </Button>

      <div className="flex items-center gap-3 text-xs text-ink-soft" aria-hidden>
        <span className="h-0.5 flex-1 bg-rule" />
        {t("orEmail")}
        <span className="h-0.5 flex-1 bg-rule" />
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        {signup && (
          <Field label={t("name")} hint={t("nameHint")} htmlFor={ids.name}>
            <TextInput
              id={ids.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={80}
            />
          </Field>
        )}
        <Field label={t("email")} htmlFor={ids.email}>
          <TextInput
            id={ids.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => set({ email: e.target.value })}
            aria-invalid={error?.field === "email" || undefined}
            aria-describedby={described("email")}
            className={clsx(error?.field === "email" && "border-danger")}
          />
          {errorFor("email")}
        </Field>
        <Field
          label={t("password")}
          hint={signup && error?.field !== "password" ? t("passwordHint") : undefined}
          htmlFor={ids.password}
        >
          <TextInput
            id={ids.password}
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error?.field === "password" || undefined}
            aria-describedby={described("password")}
            className={clsx(error?.field === "password" && "border-danger")}
          />
          {errorFor("password")}
        </Field>
        {errorFor("form")}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {signup ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => set({ mode: "reset" })}
              className="text-[13px] font-medium text-ink underline underline-offset-4 hover:text-ink-soft"
            >
              {t("forgot")}
            </button>
          )}
          <Button type="submit" variant="primary" disabled={busy !== null}>
            {!signup && <SignInIcon size={16} weight="bold" aria-hidden />}
            {busy === "email"
              ? signup
                ? t("creating")
                : t("signingIn")
              : signup
                ? t("signup")
                : t("signin")}
          </Button>
        </div>
      </form>

      <PrivacyLine />
    </div>
  );
}

/** Asks for a reset link. Says the same thing whether or not the address has an account. */
function ResetRequest() {
  const email = useAuthDialog((s) => s.email);
  const set = useAuthDialog((s) => s.set);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const locale = useLocale();
  const t = useTranslations("account.resetRequest");
  const td = useTranslations("account.dialog");
  const { text, message } = useAuthMessage();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!looksLikeEmail(address)) {
      setError(text("enterEmail"));
      return;
    }
    setError(null);
    setBusy(true);
    const { error } = await authClient.requestPasswordReset({
      email: address,
      // The reset page in this page's language; the email follows it too.
      redirectTo: getPathname({ href: "/reset-password", locale }),
    });
    setBusy(false);
    // Only a limit or a dead connection is worth saying; nothing else gives away
    // whether the address has an account.
    if (error && (error.status === 429 || !error.status)) {
      setError(message(error).text);
      return;
    }
    setSentTo(address);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <Notice>
          {t.rich("sent", {
            email: sentTo,
            strong: () => <EmailText email={sentTo} className="font-semibold" />,
          })}
        </Notice>
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => set({ mode: "signin" })}>
            {t("back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-ink-soft">{t("intro", { app: APP_NAME })}</p>
      <Field label={td("email")} htmlFor={id}>
        <TextInput
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(e) => set({ email: e.target.value })}
          aria-invalid={!!error || undefined}
          className={clsx(error && "border-danger")}
        />
        {error && (
          <p role="alert" className="text-[13px] leading-snug text-danger">
            {error}
          </p>
        )}
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => set({ mode: "signin" })}
          className="text-[13px] font-medium text-ink underline underline-offset-4 hover:text-ink-soft"
        >
          {t("back")}
        </button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
}

/** After sign-up: the address the link went to, a resend, and a way back. */
function CheckInbox() {
  const email = useAuthDialog((s) => s.email);
  const set = useAuthDialog((s) => s.set);
  const pathname = usePathname();
  const inStudio = pathname === "/studio";
  const t = useTranslations("account.inbox");

  return (
    <div className="flex flex-col gap-5">
      <Notice>
        {t.rich("sent", {
          email,
          strong: () => <EmailText email={email} className="font-semibold text-ink" />,
        })}
      </Notice>
      <p className="text-[13px] leading-relaxed text-ink-soft">{t("keepWorking")}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResendButton email={email} />
        <Button variant="primary" onClick={() => set({ open: false })}>
          {inStudio ? t("backToStudio") : t("close")}
        </Button>
      </div>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-[3px] border-2 border-card-ink bg-card text-card-ink"
      >
        <EnvelopeSimpleIcon size={18} weight="bold" />
      </span>
      <p className="text-sm leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function PrivacyLine() {
  const t = useTranslations("account.dialog");
  return (
    <p className="text-xs text-ink-soft">
      {t.rich("privacy", {
        link: (chunks) => (
          <Link
            href="/privacy"
            className="text-ink underline underline-offset-4"
            onClick={() => useAuthDialog.getState().set({ open: false })}
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}

/** When each address may be sent another confirmation link. Shared by the banner and dialog. */
const useResend = create<{ until: Record<string, number>; start: (email: string) => void }>()(
  (set) => ({
    until: {},
    start: (email) => set((s) => ({ until: { ...s.until, [email]: Date.now() + COOLDOWN_MS } })),
  }),
);

/** Seconds left on a cooldown, ticking while it runs. */
function useSecondsLeft(until: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const tick = () => {
      setNow(Date.now());
      if (Date.now() >= until) clearInterval(t);
    };
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 500);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [until]);
  if (!until) return 0;
  return Math.min(COOLDOWN_MS / 1000, Math.max(0, Math.ceil((until - now) / 1000)));
}

/**
 * Sends the confirmation link again. After a send it waits 30 seconds, and says so
 * on the button, so nobody wonders whether the click did anything.
 */
export function ResendButton({
  email,
  className,
  size = "md",
}: {
  email: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const until = useResend((s) => s.until[email]);
  const start = useResend((s) => s.start);
  const left = useSecondsLeft(until);
  const [busy, setBusy] = useState(false);
  const locale = useLocale();
  const t = useTranslations("account.resend");
  const { message } = useAuthMessage();

  async function resend() {
    setBusy(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: verifiedUrl(locale),
    });
    setBusy(false);
    if (error) {
      toast.error(message(error).text);
      return;
    }
    start(email);
    toast(t("sent"), { description: email });
  }

  return (
    <Button
      size={size}
      onClick={resend}
      disabled={busy || left > 0}
      className={clsx("tabular-nums", className)}
    >
      {busy ? t("sending") : left > 0 ? t("wait", { seconds: left }) : t("button")}
    </Button>
  );
}
