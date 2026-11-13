"use client";

import { ImageIcon, TrashIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Window } from "@/components/lofi/Window";
import { Button, Dialog, Segmented } from "@/components/ui/controls";
import { forgetImage } from "@/lib/sync/images";
import { useSyncState } from "@/lib/sync/state";
import { formatBytes } from "./StorageMeter";

export interface AccountImage {
  id: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  contentType: string;
  createdAt: number;
  /** Linked from a club or the design saved in the account (any device). */
  inUse?: boolean;
}

type Order = "largest" | "newest";

async function remove(id: string): Promise<{ used: number; limit: number }> {
  const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? "That image couldn't be deleted. Try again.");
  return { used: body.used, limit: body.limit };
}

/**
 * Every image saved to the account, with where it's used in the studio. Deleting
 * one removes it from the account and from any club or design that used it.
 */
export function StorageImages({
  images,
  usage,
  onDeleted,
}: {
  images: AccountImage[];
  /** Labels of where each image URL is used in this browser's studio. */
  usage: Record<string, string[]>;
  onDeleted: (ids: string[], used: number) => void;
}) {
  const [order, setOrder] = useState<Order>("largest");
  const [confirm, setConfirm] = useState<AccountImage | "unused" | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () =>
      [...images].sort((a, b) =>
        order === "largest" ? b.bytes - a.bytes : b.createdAt - a.createdAt,
      ),
    [images, order],
  );
  // Unused means unused everywhere: not in the clubs saved to the account (any device)
  // and not in this browser's unsaved edits. Only offered once this browser is in step.
  const syncStatus = useSyncState((s) => s.status);
  const inStep = syncStatus === "saved";
  const isUnused = (i: AccountImage) => !i.inUse && (usage[i.url] ?? []).length === 0;
  const unused = inStep ? images.filter(isUnused) : [];
  const unusedBytes = unused.reduce((n, i) => n + i.bytes, 0);

  async function run() {
    if (!confirm) return;
    setBusy(true);
    const targets = confirm === "unused" ? unused : [confirm];
    const done: string[] = [];
    let used: number | null = null;
    try {
      for (const img of targets) {
        const r = await remove(img.id);
        forgetImage(img.url);
        done.push(img.id);
        used = r.used;
      }
      toast.success(done.length === 1 ? "Image deleted" : `${done.length} images deleted`);
      setConfirm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed. Try again.");
    } finally {
      if (done.length && used !== null) onDeleted(done, used);
      setBusy(false);
    }
  }

  const single = confirm && confirm !== "unused" ? confirm : null;
  const singleUse = single ? (usage[single.url] ?? []) : [];

  return (
    <Window
      title="Your images"
      right={
        <span className="text-[13px] text-chalk/75 tabular-nums">
          {images.length} {images.length === 1 ? "image" : "images"}
        </span>
      }
      bodyClassName="flex flex-col gap-4 p-5"
    >
      {images.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-2 border-dashed border-ink/25 p-6">
          <ImageIcon size={32} weight="duotone" className="text-ink-soft" aria-hidden />
          <p className="max-w-[48ch] text-sm leading-relaxed text-ink-soft">
            No images yet. Crests and photos you add in the studio show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Sort images"
              value={order}
              onChange={setOrder}
              options={[
                { value: "largest", label: "Largest first" },
                { value: "newest", label: "Newest first" },
              ]}
            />
            {unused.length > 0 && (
              <Button variant="danger" size="sm" onClick={() => setConfirm("unused")}>
                <TrashIcon size={16} weight="bold" aria-hidden />
                Delete all unused ({unused.length})
              </Button>
            )}
          </div>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((img) => {
              const used = usage[img.url] ?? [];
              return (
                <li
                  key={img.id}
                  className="flex min-w-0 flex-col border-2 border-edge bg-paper shadow-[3px_3px_0_var(--edge)]"
                >
                  {/* Checkerboard so transparent crests read as transparent. */}
                  <div className="grid aspect-square place-items-center border-b-2 border-edge bg-[conic-gradient(var(--well)_25%,var(--paper)_0_50%,var(--well)_0_75%,var(--paper)_0)] bg-[length:16px_16px] p-2">
                    <img
                      src={img.url}
                      alt=""
                      loading="lazy"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-2.5">
                    <p className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-ink tabular-nums">
                        {formatBytes(img.bytes)}
                      </span>
                      <span className="text-ink-soft tabular-nums">
                        {img.width}×{img.height}
                      </span>
                    </p>
                    {used.length > 0 ? (
                      <p className="line-clamp-2 text-xs leading-snug text-ink-soft">
                        Used in: {used.join(", ")}
                      </p>
                    ) : img.inUse ? (
                      <p className="text-xs text-ink-soft">Used in a club on another device</p>
                    ) : (
                      <p className="self-start bg-well px-1.5 py-0.5 text-xs text-ink-soft">
                        Not used in any club
                      </p>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      className="mt-auto self-start px-2"
                      aria-label={`Delete ${img.width}×${img.height} image, ${formatBytes(img.bytes)}`}
                      onClick={() => setConfirm(img)}
                    >
                      <TrashIcon size={16} weight="bold" aria-hidden />
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && !busy && setConfirm(null)}
        title={confirm === "unused" ? "Delete unused images?" : "Delete this image?"}
        description={
          confirm === "unused"
            ? `This deletes ${unused.length} ${unused.length === 1 ? "image" : "images"} no club uses, freeing ${formatBytes(unusedBytes)}. They can't be brought back.`
            : singleUse.length > 0
              ? `It's used in: ${singleUse.join(", ")}. Those spots go blank until you add another image. It can't be brought back.`
              : "No club uses it. It can't be brought back."
        }
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={run}
              className={clsx(busy && "cursor-wait")}
            >
              {busy ? "Deleting…" : confirm === "unused" ? "Delete unused images" : "Delete image"}
            </Button>
          </>
        }
      >
        {single && (
          <div className="grid h-40 place-items-center border-2 border-edge bg-well p-2">
            <img src={single.url} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        )}
      </Dialog>
    </Window>
  );
}
