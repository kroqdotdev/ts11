"use client";

import { ArrowLeftIcon, EnvelopeSimpleIcon, WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/controls";
import { authClient, useSession } from "@/lib/auth-client";
import { useHydrated, useStudio } from "@/lib/store";
import { imageUsage } from "@/lib/sync/images";
import { AccountPageDetails } from "./AccountPageDetails";
import { AccountPageSignIn } from "./AccountPageSignIn";
import { AuthDialog } from "./AuthDialog";
import { DangerZone } from "./DangerZone";
import { StorageImages, type AccountImage } from "./StorageImages";
import { StorageMeter } from "./StorageMeter";

interface StorageData {
  images: AccountImage[];
  used: number;
  limit: number;
  imageLimit: number;
  clubs: number;
  clubLimit: number;
}

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: StorageData };

async function loadStorage(): Promise<Load> {
  try {
    const res = await fetch("/api/images", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
      return { state: "error", message: body.message ?? "Your storage couldn't be loaded." };
    return { state: "ready", data: body as StorageData };
  } catch {
    return { state: "error", message: "No connection. Check your internet and try again." };
  }
}

/** The images and allowance for the signed-in, confirmed account. */
function useStorage(enabled: boolean) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadStorage().then((next) => live && setLoad(next));
    return () => {
      live = false;
    };
  }, [enabled]);
  const retry = useCallback(() => {
    setLoad({ state: "loading" });
    loadStorage().then(setLoad);
  }, []);
  return { load, setLoad, retry };
}

/** Which providers the account signs in with, e.g. ["credential", "google"]. */
function useProviders(userId: string | undefined) {
  const [providers, setProviders] = useState<string[] | null>(null);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    authClient.listAccounts().then(({ data }) => {
      if (live) setProviders(data ? [...new Set(data.map((a) => a.providerId))] : []);
    });
    return () => {
      live = false;
    };
  }, [userId]);
  return providers;
}

/**
 * `signedIn` comes from the server when it's known, so a signed-out visitor sees the
 * sign-in panel in the first HTML instead of a skeleton while the session loads.
 */
export function AccountPage({ signedIn }: { signedIn?: boolean }) {
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const verified = !!user?.emailVerified;
  const { load, setLoad, retry } = useStorage(verified);
  const providers = useProviders(user?.id);

  // The studio's own data says where each image is used.
  const hydrated = useHydrated();
  const teams = useStudio((s) => s.teams);
  const design = useStudio((s) => s.design);
  const images = load.state === "ready" ? load.data.images : null;
  const usage = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!hydrated || !images) return map;
    for (const img of images) map[img.url] = imageUsage(img.url);
    return map;
    // teams and design are what imageUsage reads; recompute when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, images, teams, design]);

  return (
    <div className="flex min-h-dvh flex-col bg-grass-deep text-chalk">
      <header className="flex h-16 shrink-0 items-center gap-4 px-4 lg:px-5">
        <Wordmark />
        <Link
          href="/studio"
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-[4px] border-2 border-card-ink bg-paper px-4 text-sm text-ink shadow-[2px_2px_0_var(--card-ink)] transition-[translate,box-shadow] hover:-translate-y-px hover:shadow-[3px_3px_0_var(--card-ink)] active:translate-x-px active:translate-y-px active:shadow-none"
        >
          <ArrowLeftIcon size={16} weight="bold" aria-hidden />
          Back to the studio
        </Link>
      </header>

      <main className="pixel-stage flex-1 border-t-2 border-card-ink px-4 py-8 sm:px-6 lg:py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <h1 className="font-signage text-[44px] leading-none text-chalk [text-shadow:3px_3px_0_var(--card-ink)] sm:text-[56px]">
            Storage and account
          </h1>

          {isPending && signedIn === false ? (
            <AccountPageSignIn />
          ) : isPending ? (
            <PageSkeleton />
          ) : !user ? (
            <AccountPageSignIn />
          ) : !verified ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
              <ConfirmEmail email={user.email} />
              <AccountPageDetails email={user.email} name={user.name} providers={providers} />
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
              <div className="flex min-w-0 flex-col gap-8">
                {load.state === "loading" && <StorageSkeleton />}
                {load.state === "error" && (
                  <Window title="Storage" bodyClassName="flex flex-col items-start gap-3 p-5">
                    <p
                      role="alert"
                      className="flex items-start gap-2 text-sm leading-relaxed text-danger"
                    >
                      <WarningIcon
                        size={18}
                        weight="bold"
                        className="mt-0.5 shrink-0"
                        aria-hidden
                      />
                      {load.message}
                    </p>
                    <Button onClick={retry}>Try again</Button>
                  </Window>
                )}
                {load.state === "ready" && (
                  <>
                    <StorageMeter
                      used={load.data.used}
                      limit={load.data.limit}
                      clubs={load.data.clubs}
                      clubLimit={load.data.clubLimit}
                    />
                    <StorageImages
                      images={load.data.images}
                      usage={usage}
                      onDeleted={(ids, used) =>
                        setLoad((prev) =>
                          prev.state === "ready"
                            ? {
                                state: "ready",
                                data: {
                                  ...prev.data,
                                  used,
                                  images: prev.data.images.filter((i) => !ids.includes(i.id)),
                                },
                              }
                            : prev,
                        )
                      }
                    />
                  </>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-8">
                <AccountPageDetails email={user.email} name={user.name} providers={providers} />
                {providers !== null && (
                  <DangerZone hasPassword={providers.includes("credential")} />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <AuthDialog />
    </div>
  );
}

function ConfirmEmail({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function resend() {
    setBusy(true);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/account" });
    setBusy(false);
    if (error) {
      toast.error(
        error.status === 429
          ? "That's a few emails already. Wait a while, then try again."
          : (error.message ?? "The email couldn't be sent. Try again."),
      );
      return;
    }
    setSent(true);
    toast.success("Email sent. Check your inbox.");
  }

  return (
    <Window title="Confirm your email" bodyClassName="flex flex-col items-start gap-4 p-5">
      <EnvelopeSimpleIcon size={36} weight="duotone" className="text-ink-soft" aria-hidden />
      <p className="max-w-[56ch] text-sm leading-relaxed text-ink">
        We sent a link to <strong className="break-all">{email}</strong>. Confirm it to start saving
        clubs and images to your account. Until then everything stays in this browser.
      </p>
      <Button variant="primary" disabled={busy || sent} onClick={resend}>
        {sent ? "Email sent" : busy ? "Sending…" : "Send the link again"}
      </Button>
    </Window>
  );
}

/** Same blocks as the loaded page, so nothing jumps when it arrives. */
function PageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your account"
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start"
    >
      <StorageSkeleton />
      <SkeletonWindow lines={4} />
    </div>
  );
}

function StorageSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading your storage">
      <SkeletonWindow lines={3} />
      <SkeletonWindow lines={6} grid />
    </div>
  );
}

function SkeletonWindow({ lines, grid = false }: { lines: number; grid?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[4px] border-2 border-card-ink bg-paper shadow-[6px_6px_0_var(--card-ink)]">
      <div className="h-9 border-b-2 border-card-ink bg-grass-deep" />
      <div
        className={grid ? "grid grid-cols-2 gap-4 p-5 sm:grid-cols-3" : "flex flex-col gap-3 p-5"}
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={grid ? "aspect-square animate-pulse bg-well" : "h-5 animate-pulse bg-well"}
            style={grid ? undefined : { width: `${90 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}
