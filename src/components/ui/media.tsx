"use client";

import { Popover } from "@base-ui/react/popover";
import { ImageSquareIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { isHex, normalizeHex } from "@/lib/color";
import {
  crestBackground,
  crestKindOf,
  removeCrestBackground,
  type CrestBackground,
} from "@/lib/crest";
import { readImage, type ImagePurpose } from "@/lib/image";
import { Button } from "./controls";

const SWATCHES = [
  "#c4232f",
  "#7a1c33",
  "#e4572e",
  "#f0c419",
  "#17553a",
  "#2e8b57",
  "#0f6f74",
  "#86c0ea",
  "#1d3f8f",
  "#15295c",
  "#5b2a86",
  "#111418",
  "#f4f4f1",
];

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }
  const id = useId();

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <div className="flex h-10 items-stretch rounded-[3px] border-2 border-ink/30 bg-paper transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[3px_3px_0_var(--card)] hover:border-ink/60">
        <Popover.Root>
          <Popover.Trigger
            aria-label={`Pick ${label.toLowerCase()}`}
            className="m-1 w-8 shrink-0 rounded-[2px] border-2 border-ink/80"
            style={{ background: value }}
          />
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} align="start" className="z-50">
              <Popover.Popup className="flex w-60 flex-col gap-3 rounded-[4px] border-2 border-edge bg-paper p-3 shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                <HexColorPicker color={value} onChange={onChange} className="!w-full" />
                <div className="grid grid-cols-7 gap-1.5">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => onChange(c)}
                      className={clsx(
                        "aspect-square rounded-[2px] border-2 border-ink/25 transition-transform hover:scale-110",
                        c === value && "border-ink shadow-[2px_2px_0_var(--card)]",
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <input
          id={id}
          value={draft}
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value);
            if (isHex(e.target.value)) onChange(normalizeHex(e.target.value));
          }}
          onBlur={() => setDraft(value)}
          className="w-full min-w-0 bg-transparent pr-3 font-mono text-sm text-ink uppercase focus:outline-none"
        />
      </div>
    </div>
  );
}

export function ImageField({
  label,
  hint,
  value,
  onChange,
  purpose,
  preview = "contain",
  children,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  purpose: ImagePurpose;
  preview?: "contain" | "cover";
  children?: ReactNode;
  /** Shown in the preview box until an image is added. */
  placeholder?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const id = useId();

  async function take(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await readImage(file, purpose));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not use that image.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void take(e.dataTransfer.files[0]);
        }}
        className={clsx(
          "flex items-center gap-3 rounded-[3px] border-2 border-dashed p-2 transition-colors",
          dragging ? "border-ink bg-card/20" : "border-ink/30",
        )}
      >
        <div
          className={clsx(
            "grid size-14 shrink-0 place-items-center overflow-hidden rounded-[2px] bg-well text-ink-soft",
            busy && "animate-pulse",
          )}
        >
          {value ? (
            <img
              src={value}
              alt=""
              className={clsx("size-full", preview === "cover" ? "object-cover" : "object-contain")}
            />
          ) : (
            (placeholder ?? <ImageSquareIcon size={22} />)
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            ref={input}
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void take(e.target.files?.[0])}
          />
          <Button onClick={() => input.current?.click()} disabled={busy}>
            <UploadSimpleIcon size={16} />
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button
              variant="danger"
              size="icon"
              aria-label={`Remove ${label.toLowerCase()}`}
              onClick={() => onChange(null)}
            >
              <TrashIcon size={16} />
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs leading-snug text-ink-soft">{hint}</p>}
      {value && children}
    </div>
  );
}

/** Whether a crest image sits on a solid background (read once per image). */
export function useCrestBackground(src: string | null): CrestBackground | null {
  const [check, setCheck] = useState<{ src: string; bg: CrestBackground | null } | null>(null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    crestBackground(src)
      .then((bg) => live && setCheck({ src, bg }))
      .catch(() => live && setCheck({ src, bg: null }));
    return () => {
      live = false;
    };
  }, [src]);
  return src && check?.src === src ? check.bg : null;
}

/**
 * The crest upload, plus a fix for the most common problem: a crest saved on a
 * white square, which shows as a white box on dark graphics.
 */
export function CrestField({
  value,
  onChange,
  hint,
  placeholder,
}: {
  value: string | null;
  /** `kind` says whether the crest fills its square ("opaque") or is cut out. */
  onChange: (value: string | null, kind: "opaque" | "transparent" | undefined) => void;
  hint?: string;
  placeholder?: ReactNode;
}) {
  const bg = useCrestBackground(value);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <ImageField
        label="Crest"
        hint={hint}
        value={value}
        purpose="crest"
        onChange={async (next) => {
          if (!next) return onChange(null, undefined);
          onChange(next, await crestKindOf(next));
        }}
        placeholder={placeholder}
      />
      {value && bg && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[3px] border-2 border-card-ink bg-card/15 px-3 py-2 text-[13px]"
        >
          <span
            aria-hidden
            className="size-5 shrink-0 rounded-[2px] border-2 border-card-ink"
            style={{ background: bg.color }}
          />
          <span className="min-w-0 flex-1">
            {bg.light ? "This crest is on a white square" : "This crest is on a solid square"}.
            Graphics put it on a neat plate, or remove the background to place it straight on the
            colours.
          </span>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                onChange(await removeCrestBackground(value, bg), "transparent");
                toast.success("Background removed");
              } catch {
                toast.error("Could not remove the background. Try a PNG with a transparent one.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove {bg.light ? "white " : ""}background
          </Button>
        </div>
      )}
    </div>
  );
}
