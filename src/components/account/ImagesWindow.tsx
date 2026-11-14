"use client";

import { ImageIcon, TrashIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Window } from "@/components/lofi/Window";
import { Button, Dialog, Segmented } from "@/components/ui/controls";
import { useHydrated, useStudio } from "@/lib/store";
import { forgetImage, imageUsage } from "@/lib/sync/images";
import { useSyncState } from "@/lib/sync/state";
import { formatBytes } from "./messages";

export interface AccountImage {
  id: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  contentType: string;
  createdAt: number;
  /** Linked from a club or the design saved in the account. */
  inUse: boolean;
}

type Sort = "size" | "new";

/** Where an image is used: this browser's labels, or the account's say-so. */
function usageOf(img: AccountImage): string[] | null {
  const local = imageUsage(img.url);
  if (local.length) return local;
  return img.inUse ? [] : null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The account's uploaded images, biggest first by default, each with where it's
 * used and a delete. Deleting a used image clears it from those clubs too.
 */
export function ImagesWindow({
  images,
  onDeleted,
}: {
  images: AccountImage[];
  onDeleted: (ids: string[], used: number | null) => void;
}) {
  const [sort, setSort] = useState<Sort>("size");
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = useState<
    { kind: "one"; image: AccountImage; usage: string[] } | { kind: "unused" } | null
  >(null);
  const status = useSyncState((s) => s.status);
  // Usage is read from this browser's clubs, so wait for them and follow their changes.
  const hydrated = useHydrated();
  const teams = useStudio((s) => s.teams);
  const design = useStudio((s) => s.design);

  const rows = useMemo(() => {
    void teams;
    void design;
    const withUsage = images.map((img) => ({
      img,
      usage: hydrated ? usageOf(img) : img.inUse ? [] : null,
    }));
    return withUsage.sort((a, b) =>
      sort === "size" ? b.img.bytes - a.img.bytes : b.img.createdAt - a.img.createdAt,
    );
  }, [images, sort, hydrated, teams, design]);
  const unused = rows.filter((r) => r.usage === null).map((r) => r.img);
  // Only offered once everything is saved, so a link not yet in the account can't be missed.
  const canClean = status === "saved" && hydrated && unused.length > 0;

  async function remove(list: AccountImage[]) {
    setBusy((b) => new Set([...b, ...list.map((i) => i.id)]));
    const done: string[] = [];
    let used: number | null = null;
    for (const img of list) {
      try {
        const res = await fetch(`/api/images/${img.id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 404) throw new Error(String(res.status));
        const body = (await res.json().catch(() => ({}))) as { used?: number };
        if (typeof body.used === "number") used = body.used;
        forgetImage(img.url);
        done.push(img.id);
      } catch {
        break;
      }
    }
    setBusy((b) => {
      const next = new Set(b);
      for (const img of list) next.delete(img.id);
      return next;
    });
    if (done.length) onDeleted(done, used);
    if (done.length < list.length) {
      toast.error("Couldn't delete that image. Check your connection and try again.");
    } else {
      toast(list.length === 1 ? "Image deleted" : `${list.length} images deleted`);
    }
  }

  function ask(img: AccountImage, usage: string[] | null) {
    if (usage === null) void remove([img]);
    else setConfirm({ kind: "one", image: img, usage });
  }

  return (
    <Window
      title="Your images"
      right={
        <span className="text-xs text-chalk/75 tabular-nums">
          {plural(images.length, "image", "images")}
        </span>
      }
      bodyClassName="flex flex-col gap-4 p-4 sm:p-5"
    >
      {images.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[3px] border-2 border-dashed border-ink/30 p-5 text-sm leading-relaxed text-ink-soft">
          <ImageIcon size={26} aria-hidden className="text-ink" />
          No images yet. Crests and photos you add in the studio show up here.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Sort images"
              value={sort}
              onChange={setSort}
              options={[
                { value: "size", label: "Largest first" },
                { value: "new", label: "Newest first" },
              ]}
            />
            {canClean && (
              <Button variant="danger" size="sm" onClick={() => setConfirm({ kind: "unused" })}>
                <TrashIcon size={15} weight="bold" aria-hidden />
                Delete all unused ({unused.length})
              </Button>
            )}
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {rows.map(({ img, usage }) => (
              <li
                key={img.id}
                className={clsx(
                  "flex min-w-0 flex-col overflow-hidden rounded-[3px] border-2 border-ink bg-paper shadow-[3px_3px_0_var(--ink)] transition-opacity",
                  busy.has(img.id) && "opacity-50",
                )}
              >
                <div className="grid aspect-square place-items-center border-b-2 border-ink bg-well bg-[conic-gradient(var(--rule)_25%,transparent_0_50%,var(--rule)_0_75%,transparent_0)] bg-size-[16px_16px] p-2">
                  <img
                    src={img.url}
                    alt=""
                    loading="lazy"
                    width={img.width}
                    height={img.height}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-ink tabular-nums">
                      {formatBytes(img.bytes)}
                    </span>
                    <span className="text-ink-soft tabular-nums">
                      {img.width}×{img.height}
                    </span>
                  </div>
                  <p className="min-w-0 text-xs leading-snug text-ink-soft">
                    {usage === null
                      ? "Not used in any club"
                      : usage.length
                        ? `Used in ${usage.join(", ")}`
                        : "Used in a club in your account"}
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy.has(img.id)}
                    onClick={() => ask(img, usage)}
                    aria-label={`Delete image, ${formatBytes(img.bytes)}`}
                    className="mt-auto self-start px-2"
                  >
                    <TrashIcon size={15} weight="bold" aria-hidden />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === "unused"
            ? `Delete ${plural(unused.length, "unused image", "unused images")}?`
            : "Delete this image?"
        }
        description={
          confirm?.kind === "unused"
            ? "They aren't used in any club, in your account or in this browser. Your clubs stay as they are."
            : confirm?.kind === "one"
              ? `It's used in ${confirm.usage.length ? confirm.usage.join(", ") : "a club in your account"}. Deleting it removes it from there too, here and on your other devices.`
              : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep {confirm?.kind === "unused" && unused.length !== 1 ? "them" : "it"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const list = confirm?.kind === "unused" ? unused : confirm ? [confirm.image] : [];
                setConfirm(null);
                void remove(list);
              }}
            >
              {confirm?.kind === "unused"
                ? `Delete ${plural(unused.length, "image", "images")}`
                : "Delete image"}
            </Button>
          </>
        }
      />
    </Window>
  );
}
