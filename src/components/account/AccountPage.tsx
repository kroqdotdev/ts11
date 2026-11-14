"use client";

import {
  EnvelopeSimpleIcon,
  GoogleLogoIcon,
  SignInIcon,
  SignOutIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Window } from "@/components/lofi/Window";
import { Button } from "@/components/ui/controls";
import { Wordmark } from "@/components/Wordmark";
import { authClient, useSession } from "@/lib/auth-client";
import { signOutWithToast } from "./AccountButton";
import { AuthDialog, ResendButton } from "./AuthDialog";
import { useAuthDialog } from "./authDialogStore";
import { DeleteAccount } from "./DeleteAccount";
import { EmailText } from "./EmailText";
import { ImagesWindow, type AccountImage } from "./ImagesWindow";
import { StorageMeter } from "./StorageMeter";

interface Storage {
  images: AccountImage[];
  used: number;
  limit: number;
  imageLimit: number;
  clubs: number;
  clubLimit: number;
}

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; data: Storage };

/**
 * /account: storage (with the images that use it) and the account itself. The server
 * says whether there's a session, so the right panels are in the first HTML; the
 * details fill in from the browser's session.
 */
export function AccountPage({ signedIn }: { signedIn?: boolean }) {
  const { data, isPending } = useSession();
  const user = data?.user ?? null;
  // Until the browser knows, trust the server; after that, follow sign-in and sign-out here.
  const known = !isPending || !!user;
  const isIn = known ? !!user : signedIn;

  let body: ReactNode;
  if (isIn === false) body = <SignedOut />;
  else if (!user) body = <Skeleton />;
  else if (!user.emailVerified) body = <Unverified user={user} />;
  else body = <SignedIn user={user} />;

  return (
    <main className="pixel-stage flex min-h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b-2 border-card-ink bg-grass-deep px-4 text-chalk lg:px-8">
        <Wordmark className="text-[24px]" />
        <Link
          href="/studio"
          className="lofi-press rounded-[4px] border-2 border-card-ink bg-paper px-3 py-1.5 text-sm font-medium text-ink shadow-[3px_3px_0_var(--card-ink)]"
        >
          Back to the studio
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-8 pb-16 lg:px-8 lg:pt-12">
        <h1 className="font-signage text-[40px] leading-none text-chalk sm:text-[52px]">
          Storage and account
        </h1>
        {body}
      </div>
      <AuthDialog />
    </main>
  );
}

type User = NonNullable<ReturnType<typeof useSession>["data"]>["user"];

/** Two columns on desktop (storage and images, then the account), one on phones. */
function Columns({ main, side }: { main: ReactNode; side: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <div className="flex min-w-0 flex-col gap-6">{side}</div>
    </div>
  );
}

function SignedOut() {
  const show = useAuthDialog((s) => s.show);
  return (
    <Window
      title="Sign in to see your account"
      className="w-full max-w-xl"
      bodyClassName="flex flex-col gap-5 p-4 sm:p-5"
    >
      <p className="text-sm leading-relaxed text-ink-soft">
        Your storage, uploaded images and account settings are here once you sign in. Without an
        account, your clubs stay in this browser.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => show("signin")}>
          <SignInIcon size={16} weight="bold" aria-hidden />
          Sign in
        </Button>
        <Button onClick={() => show("signup")}>Create account</Button>
      </div>
    </Window>
  );
}

/** The sign-in methods on the account, for "Signs in with" and the delete dialog. */
function useProviders(userId: string): string[] | null {
  const [providers, setProviders] = useState<{ userId: string; list: string[] } | null>(null);
  useEffect(() => {
    let live = true;
    authClient
      .listAccounts()
      .then(({ data }) => {
        if (live) setProviders({ userId, list: (data ?? []).map((a) => a.providerId) });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [userId]);
  return providers?.userId === userId ? providers.list : null;
}

function Unverified({ user }: { user: User }) {
  const providers = useProviders(user.id);
  return (
    <Columns
      main={
        <Window
          title="Confirm your email"
          bodyClassName="flex flex-col items-start gap-4 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-[3px] border-2 border-card-ink bg-card text-card-ink"
            >
              <EnvelopeSimpleIcon size={18} weight="bold" />
            </span>
            <p className="text-sm leading-relaxed text-ink">
              We sent a link to <EmailText email={user.email} className="font-semibold" />. Open it
              to confirm your email; your storage and images show up here after that. Until then,
              your clubs stay in this browser.
            </p>
          </div>
          <ResendButton email={user.email} />
        </Window>
      }
      side={
        <>
          <AccountWindow user={user} providers={providers} />
          <DeleteAccount userId={user.id} hasPassword={hasPassword(providers)} />
        </>
      }
    />
  );
}

const hasPassword = (providers: string[] | null) =>
  providers === null ? null : providers.includes("credential");

function SignedIn({ user }: { user: User }) {
  const providers = useProviders(user.id);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    fetch("/api/images", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Storage>) : Promise.reject(res.status)))
      .then((data) => live && setLoad({ state: "ready", data }))
      .catch(() => live && setLoad({ state: "error" }));
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = () => {
    setLoad({ state: "loading" });
    setAttempt((a) => a + 1);
  };

  const onDeleted = (ids: string[], used: number | null) =>
    setLoad((l) => {
      if (l.state !== "ready") return l;
      const gone = new Set(ids);
      const images = l.data.images.filter((i) => !gone.has(i.id));
      const freed = l.data.images.filter((i) => gone.has(i.id)).reduce((n, i) => n + i.bytes, 0);
      return {
        state: "ready",
        data: { ...l.data, images, used: used ?? Math.max(0, l.data.used - freed) },
      };
    });

  let main: ReactNode;
  if (load.state === "loading") main = <StorageSkeleton />;
  else if (load.state === "error") {
    main = (
      <Window title="Storage" bodyClassName="flex flex-col items-start gap-4 p-4 sm:p-5">
        <p role="alert" className="flex items-start gap-2 text-sm font-medium text-danger">
          <WarningIcon size={18} weight="bold" aria-hidden className="mt-px shrink-0" />
          Your storage couldn&apos;t be loaded.
        </p>
        <Button onClick={retry}>Try again</Button>
      </Window>
    );
  } else {
    main = (
      <>
        <Window title="Storage" bodyClassName="p-4 sm:p-5">
          <StorageMeter
            used={load.data.used}
            limit={load.data.limit}
            clubs={load.data.clubs}
            clubLimit={load.data.clubLimit}
          />
        </Window>
        <ImagesWindow images={load.data.images} onDeleted={onDeleted} />
      </>
    );
  }

  return (
    <Columns
      main={main}
      side={
        <>
          <AccountWindow user={user} providers={providers} />
          <DeleteAccount userId={user.id} hasPassword={hasPassword(providers)} />
        </>
      }
    />
  );
}

const PROVIDERS: Record<string, { label: string; icon: ReactNode }> = {
  credential: {
    label: "Email and password",
    icon: <EnvelopeSimpleIcon size={15} aria-hidden />,
  },
  google: { label: "Google", icon: <GoogleLogoIcon size={15} aria-hidden /> },
};

function AccountWindow({ user, providers }: { user: User; providers: string[] | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <Window title="Account" bodyClassName="flex flex-col items-start gap-4 p-4 sm:p-5">
      <dl className="flex w-full min-w-0 flex-col gap-3 text-sm">
        {user.name && (
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-ink-soft">Name</dt>
            <dd className="font-semibold break-words text-ink">{user.name}</dd>
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-xs text-ink-soft">Email</dt>
          <dd className="font-semibold text-ink">
            <EmailText email={user.email} />
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <dt className="text-xs text-ink-soft">Signs in with</dt>
          <dd className="flex flex-wrap gap-2">
            {providers === null ? (
              <span aria-busy className="h-7 w-36 rounded-[2px] bg-well" />
            ) : (
              providers.map((p) => (
                <span
                  key={p}
                  className="inline-flex h-7 items-center gap-1.5 rounded-[2px] border-2 border-ink/25 px-2 text-[13px] text-ink"
                >
                  {PROVIDERS[p]?.icon}
                  {PROVIDERS[p]?.label ?? p}
                </span>
              ))
            )}
          </dd>
        </div>
      </dl>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const ok = await signOutWithToast(false);
          if (!ok) setBusy(false);
        }}
      >
        <SignOutIcon size={16} weight="bold" aria-hidden />
        {busy ? "Signing out…" : "Sign out"}
      </Button>
    </Window>
  );
}

function Bar({ className }: { className: string }) {
  return <span aria-hidden className={`block rounded-[2px] bg-well ${className}`} />;
}

/** Blank windows the size of the real ones, so nothing jumps when they fill in. */
function StorageSkeleton() {
  return (
    <>
      <Window title="Storage" bodyClassName="flex flex-col gap-4 p-4 sm:p-5">
        <div aria-busy="true" className="flex flex-col gap-4">
          <span className="sr-only">Loading your storage</span>
          <Bar className="h-11 w-40" />
          <Bar className="h-4 w-32" />
          <Bar className="h-4 w-full" />
          <Bar className="h-10 w-full max-w-md" />
        </div>
      </Window>
      <Window title="Your images" bodyClassName="p-4 sm:p-5">
        <div aria-hidden className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Bar key={i} className="aspect-[4/5]" />
          ))}
        </div>
      </Window>
    </>
  );
}

function Skeleton() {
  return (
    <Columns
      main={<StorageSkeleton />}
      side={
        <Window title="Account" bodyClassName="flex flex-col gap-3 p-4 sm:p-5">
          <div aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Loading your account</span>
            <Bar className="h-4 w-24" />
            <Bar className="h-4 w-48" />
            <Bar className="h-10 w-28" />
          </div>
        </Window>
      }
    />
  );
}
