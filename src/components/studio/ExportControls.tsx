"use client";

import { Popover } from "@base-ui/react/popover";
import {
  CaretDownIcon,
  CopyIcon,
  DownloadSimpleIcon,
  FilesIcon,
  ShareNetworkIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { useState } from "react";
import { toast } from "sonner";
import { FORMATS } from "@/components/graphics/theme";
import { Button, Dialog, MenuButton } from "@/components/ui/controls";
import { downloadBlob, graphicFilename, renderGraphicPng } from "@/lib/export";
import { postIssues, type Issue } from "@/lib/issues";
import { KIND_LABEL } from "@/lib/kinds";
import { useActiveTeam, useStudio } from "@/lib/store";
import type { FormatId } from "@/lib/types";
import { fixIssue } from "./fixIssue";

type Action = "download" | "download2x" | "copy" | "share";

export function ExportControls({ compact = false }: { compact?: boolean }) {
  const team = useActiveTeam();
  const design = useStudio((s) => s.design);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Action | null>(null);
  const issues = postIssues(team, design);
  // Only soft checks left: the graphic is complete, something just doesn't add up.
  const onlyChecks = issues.length > 0 && issues.every((i) => i.soft);

  const filename = graphicFilename(team, design);
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File([], "x.png", { type: "image/png" })] });
  const canCopy = typeof window !== "undefined" && "ClipboardItem" in window;

  /** Exports, but checks first whether the graphic is missing anything. */
  function request(action: Action) {
    if (issues.length > 0) setPending(action);
    else void run(action);
  }

  /** On phones: every finished graphic in this size straight to the share sheet (Instagram, WhatsApp…). */
  async function shareAll() {
    if (busy) return;
    setBusy(true);
    const id = toast.loading("Drawing your graphics", { description: "Starting…" });
    try {
      const { renderAll } = await import("./batchExport");
      const { files, skipped } = await renderAll(team, design, [design.format], (done, total) =>
        toast.loading("Drawing your graphics", { id, description: `${done} of ${total}` }),
      );
      if (files.length === 0) {
        toast.error("Nothing to share yet", {
          id,
          description: "Every graphic is still missing details. Check “Before you post”.",
        });
        return;
      }
      const list = files.map((f) => new File([f.blob], f.name, { type: "image/png" }));
      if (!navigator.canShare?.({ files: list })) {
        toast.dismiss(id);
        return void runAll([design.format]);
      }
      toast.dismiss(id);
      await navigator.share({ files: list }).catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        // Drawing took long enough that the tap no longer counts: ask for one more.
        if (e instanceof DOMException && e.name === "NotAllowedError") {
          toast.success(`${list.length} graphics ready`, {
            duration: 20_000,
            action: { label: "Share", onClick: () => void navigator.share({ files: list }) },
          });
          return;
        }
        throw e;
      });
      if (skipped.length)
        toast.message(`Left out until finished: ${skipped.map((k) => KIND_LABEL[k]).join(", ")}`);
    } catch (err) {
      toast.error("Sharing failed", {
        id,
        description: err instanceof Error ? err.message : "Try “Download all” instead.",
      });
    } finally {
      setBusy(false);
    }
  }

  /** Every graphic in a zip, for this size or all four; unfinished ones are left out. */
  async function runAll(formats: FormatId[]) {
    if (busy) return;
    setBusy(true);
    const id = toast.loading("Drawing your graphics", { description: "Starting…" });
    try {
      // Loaded on demand: the zip code is only needed here.
      const { exportAll } = await import("./batchExport");
      const result = await exportAll(team, design, formats, (done, total) =>
        toast.loading("Drawing your graphics", { id, description: `${done} of ${total}` }),
      );
      if (result.count === 0) {
        toast.error("Nothing to download yet", {
          id,
          description: "Every graphic is still missing details. Check “Before you post”.",
        });
        return;
      }
      downloadBlob(result.zip, result.filename);
      const left = result.skipped.map((k) => KIND_LABEL[k]).join(", ");
      toast.success(`${result.count} PNGs downloaded`, {
        id,
        description: result.skipped.length
          ? `In ${result.filename}. Left out until finished: ${left}.`
          : `In ${result.filename}.`,
      });
    } catch (err) {
      toast.error("Export failed", {
        id,
        description: err instanceof Error ? err.message : "Try again, or use a smaller photo.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function run(action: Action) {
    if (busy) return;
    setBusy(true);
    try {
      if (action === "copy") {
        // Safari needs the promise passed straight to ClipboardItem.
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": renderGraphicPng(design.font) }),
        ]);
        toast.success("Image copied", { description: "Paste it straight into your post." });
        return;
      }
      const blob = await renderGraphicPng(design.font, action === "download2x" ? 2 : 1);
      if (action === "share") {
        await navigator
          .share({ files: [new File([blob], filename, { type: "image/png" })] })
          .catch((e: unknown) => {
            if (e instanceof DOMException && e.name === "AbortError") return;
            throw e;
          });
        return;
      }
      downloadBlob(blob, filename);
      const f = FORMATS[design.format];
      const k = action === "download2x" ? 2 : 1;
      toast.success("PNG downloaded", { description: `${f.w * k} × ${f.h * k} px, ${filename}` });
    } catch (err) {
      toast.error("Export failed", {
        description: err instanceof Error ? err.message : "Try again, or use a smaller photo.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {issues.length > 0 && <IssuesBadge issues={issues} />}
      <div className="flex items-center rounded-[4px] shadow-[3px_3px_0_var(--card-ink)]">
        <Button
          data-export-primary
          variant="primary"
          onClick={() => request(canShare && compact ? "share" : "download")}
          disabled={busy}
          className={clsx(
            "rounded-r-none border-r-0 pr-3 shadow-none hover:shadow-none active:shadow-none",
            compact && "px-3",
          )}
        >
          {busy ? (
            <SpinnerGapIcon size={18} className="animate-spin" />
          ) : canShare && compact ? (
            <ShareNetworkIcon size={18} weight="bold" />
          ) : (
            <DownloadSimpleIcon size={18} weight="bold" />
          )}
          {compact ? (canShare ? "Share" : "Save") : "Download PNG"}
        </Button>
        <MenuButton
          label="More export options"
          triggerClassName="inline-flex h-10 items-center rounded-r-[4px] border-2 border-card-ink bg-card px-2 text-card-ink hover:brightness-[1.04]"
          trigger={<CaretDownIcon size={14} weight="bold" />}
          items={[
            {
              label: "Download PNG",
              icon: <DownloadSimpleIcon size={16} />,
              onSelect: () => request("download"),
              hidden: !(canShare && compact),
            },
            {
              label: "Download at double size",
              icon: <DownloadSimpleIcon size={16} />,
              onSelect: () => request("download2x"),
            },
            {
              label: "Copy image",
              icon: <CopyIcon size={16} />,
              onSelect: () => request("copy"),
              hidden: !canCopy,
            },
            {
              label: "Share",
              icon: <ShareNetworkIcon size={16} />,
              onSelect: () => request("share"),
              hidden: !canShare || compact,
            },
            "separator",
            {
              label: `Share all graphics (${FORMATS[design.format].label})`,
              icon: <ShareNetworkIcon size={16} />,
              onSelect: () => void shareAll(),
              hidden: !canShare,
            },
            {
              label: `Download all graphics (${FORMATS[design.format].label})`,
              icon: <FilesIcon size={16} />,
              onSelect: () => void runAll([design.format]),
            },
            {
              label: "Download all graphics, every size",
              icon: <FilesIcon size={16} />,
              onSelect: () => void runAll(Object.keys(FORMATS) as FormatId[]),
            },
          ]}
        />
        <Dialog
          open={pending !== null}
          onOpenChange={(o) => !o && setPending(null)}
          title={onlyChecks ? "Worth a check before you post" : "This graphic isn't finished"}
          description={
            onlyChecks
              ? "Something in the match details doesn't add up:"
              : "The preview fills gaps with sample content, but the PNG only uses your own details, so these parts will be missing:"
          }
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  const action = pending;
                  setPending(null);
                  if (action) void run(action);
                }}
              >
                Export anyway
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setPending(null);
                  // Let the dialog hand focus back before moving it to the field.
                  const first = issues[0];
                  window.setTimeout(() => fixIssue(first), 60);
                }}
              >
                Fix it
              </Button>
            </>
          }
        >
          <ul className="flex flex-col gap-1.5 text-sm">
            {issues.map((i) => (
              <li key={i.message} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={clsx("size-2 shrink-0", i.soft ? "bg-card" : "bg-danger")}
                />
                {i.message}
              </li>
            ))}
          </ul>
        </Dialog>
      </div>
    </div>
  );
}

/** A red-card count beside the export button; tap for the list and a jump to each fix. */
function IssuesBadge({ issues }: { issues: Issue[] }) {
  const [open, setOpen] = useState(false);
  const n = issues.length;
  const soft = issues.every((i) => i.soft);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={`${n} ${n === 1 ? "thing" : "things"} to ${soft ? "check" : "fix"} before you post`}
        className={clsx(
          "relative grid h-10 min-w-10 lofi-press place-items-center rounded-[3px] border-2 border-card-ink px-2 font-signage text-[22px] leading-none shadow-[3px_3px_0_var(--card-ink)]",
          // A red card for missing details, a yellow one for things that don't add up.
          soft ? "bg-card text-card-ink" : "bg-danger text-paper",
        )}
      >
        {n}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} align="end" className="z-50">
          <Popover.Popup className="w-[min(20rem,calc(100vw-1.5rem))] origin-(--transform-origin) rounded-[4px] border-2 border-edge bg-paper text-ink shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <Popover.Title className="flex items-center gap-2 border-b-2 border-edge bg-grass-deep px-3 py-2 font-signage text-[20px] leading-none text-chalk">
              <span aria-hidden className={clsx("size-2.5", soft ? "bg-card" : "bg-danger")} />
              Before you post
            </Popover.Title>
            <ul className="flex flex-col p-1.5">
              {issues.map((issue) => (
                <li key={issue.message}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      window.setTimeout(() => fixIssue(issue), 60);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-[3px] px-2 py-2.5 text-left text-sm hover:bg-well"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={clsx("size-2 shrink-0", issue.soft ? "bg-card" : "bg-danger")}
                      />
                      {issue.message}
                    </span>
                    <span className="shrink-0 rounded-[3px] border-2 border-card-ink bg-card px-2 py-0.5 text-[12px] font-semibold text-card-ink">
                      {issue.soft ? "Check" : "Fix"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
