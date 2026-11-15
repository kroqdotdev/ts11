"use client";

import { Popover } from "@base-ui/react/popover";
import {
  EyedropperIcon,
  ImageSquareIcon,
  ShieldIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { isHex, normalizeHex } from "@/lib/color";
import {
  crestBackground,
  crestKindOf,
  crestPalette,
  crestPixels,
  removeCrestBackground,
  type CrestBackground,
} from "@/lib/crest";
import { ImageError, readImage, type ImagePurpose } from "@/lib/image";
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

/** The browser's screen eyedropper (Chromium only, for now). */
type EyeDropperApi = new () => { open: () => Promise<{ sRGBHex: string }> };
function eyeDropper(): EyeDropperApi | undefined {
  return typeof window === "undefined"
    ? undefined
    : (window as unknown as { EyeDropper?: EyeDropperApi }).EyeDropper;
}

/** A crest's main colours, read once per image while the picker is open. */
function useCrestPalette(src: string | null | undefined): string[] {
  const [read, setRead] = useState<{ src: string; colors: string[] } | null>(null);
  useEffect(() => {
    if (!src) return;
    let live = true;
    void crestPalette(src).then((colors) => live && setRead({ src, colors }));
    return () => {
      live = false;
    };
  }, [src]);
  return src && read?.src === src ? read.colors : [];
}

// The space inside the popup (w-64, p-3) and the frame's 2px borders.
const BOX = { w: 220, h: 176 };

/**
 * The crest drawn big, for picking the exact colour of any part of it: point to see the
 * colour, click (or drag on a phone) to take it.
 */
function CrestColorPicker({
  src,
  onPick,
  onBack,
}: {
  src: string;
  onPick: (hex: string) => void;
  onBack: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pixels = useRef<{ data: ImageData; w: number; h: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const pressed = useRef(false);
  const t = useTranslations("ui.color");

  useEffect(() => {
    let live = true;
    crestPixels(src, 512)
      .then((px) => {
        if (!live) return;
        pixels.current = px;
        const scale = Math.min(BOX.w / px.w, BOX.h / px.h);
        setSize({ w: Math.round(px.w * scale), h: Math.round(px.h * scale) });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [src]);

  // Paint once the canvas is on the page at its final size.
  useEffect(() => {
    const px = pixels.current;
    const el = canvas.current;
    if (!px || !el || !size) return;
    el.width = px.w;
    el.height = px.h;
    el.getContext("2d")?.putImageData(px.data, 0, 0);
  }, [size]);

  function colorAt(e: React.PointerEvent<HTMLCanvasElement>): string | null {
    const px = pixels.current;
    if (!px || !size) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * px.w);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * px.h);
    if (x < 0 || y < 0 || x >= px.w || y >= px.h) return null;
    const i = (y * px.w + x) * 4;
    const d = px.data.data;
    // See-through pixels have no colour of their own.
    if (d[i + 3] < 128) return null;
    return normalizeHex(
      "#" + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join(""),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid place-items-center rounded-[2px] border-2 border-ink/25"
        style={{
          height: BOX.h + 4,
          // A chequerboard, so see-through parts read as see-through.
          background: "repeating-conic-gradient(#d9d9d4 0 25%, #f4f4f1 0 50%) 0 0 / 14px 14px",
        }}
      >
        {failed ? (
          <p className="px-4 text-center text-xs text-ink-soft">{t("logoFailed")}</p>
        ) : (
          size && (
            <canvas
              ref={canvas}
              role="img"
              aria-label={t("logoArea")}
              className="cursor-crosshair touch-none"
              style={{ width: size.w, height: size.h }}
              onPointerDown={(e) => {
                pressed.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                const c = colorAt(e);
                setHover(c);
                if (c) onPick(c);
              }}
              onPointerMove={(e) => {
                const c = colorAt(e);
                setHover(c);
                if (pressed.current && c) onPick(c);
              }}
              onPointerUp={() => {
                pressed.current = false;
              }}
              onPointerLeave={() => !pressed.current && setHover(null)}
            />
          )
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <span
          aria-hidden
          className="size-4 shrink-0 rounded-[2px] border-2 border-ink/40"
          style={{ background: hover ?? "transparent" }}
        />
        <span className="min-w-0 flex-1 font-mono uppercase">
          {hover ?? <span className="font-sans normal-case">{t("logoHint")}</span>}
        </span>
        <button
          type="button"
          onClick={onBack}
          // The "Pick from logo" button that opened this is gone: keep the focus in the popup.
          autoFocus
          className="shrink-0 font-semibold text-ink underline-offset-2 hover:underline"
        >
          {t("back")}
        </button>
      </div>
    </div>
  );
}

function Swatch({
  color,
  value,
  onChange,
}: {
  color: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <button
      type="button"
      aria-label={color}
      title={color.toUpperCase()}
      onClick={() => onChange(color)}
      className={clsx(
        "aspect-square rounded-[2px] border-2 border-ink/25 transition-transform hover:scale-110",
        color.toLowerCase() === value.toLowerCase() && "border-ink shadow-[2px_2px_0_var(--card)]",
      )}
      style={{ background: color }}
    />
  );
}

function ColorPopup({
  value,
  onChange,
  logo,
}: {
  value: string;
  onChange: (value: string) => void;
  logo?: string | null;
}) {
  const [fromLogo, setFromLogo] = useState(false);
  const logoButton = useRef<HTMLButtonElement>(null);
  const backToPicker = useRef(false);
  useEffect(() => {
    // Back from the logo: focus returns to the button that opened it.
    if (!fromLogo && backToPicker.current) logoButton.current?.focus();
    backToPicker.current = false;
  }, [fromLogo]);
  const palette = useCrestPalette(logo);
  const Dropper = eyeDropper();
  const t = useTranslations("ui.color");

  async function fromScreen() {
    if (!Dropper) return;
    try {
      const { sRGBHex } = await new Dropper().open();
      if (isHex(sRGBHex)) onChange(normalizeHex(sRGBHex));
    } catch {
      // Cancelled with Escape: nothing to do.
    }
  }

  return (
    <>
      {logo && fromLogo ? (
        <CrestColorPicker
          // A new logo starts the picker afresh.
          key={logo}
          src={logo}
          onPick={onChange}
          onBack={() => {
            backToPicker.current = true;
            setFromLogo(false);
          }}
        />
      ) : (
        <HexColorPicker color={value} onChange={onChange} className="!w-full" />
      )}
      {logo && palette.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-ink">{t("inLogo")}</span>
          <div className="grid grid-cols-7 gap-1.5">
            {palette.map((c) => (
              <Swatch key={c} color={c} value={value} onChange={onChange} />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-7 gap-1.5">
        {SWATCHES.map((c) => (
          <Swatch key={c} color={c} value={value} onChange={onChange} />
        ))}
      </div>
      {(logo || Dropper) && (
        <div className="flex flex-wrap gap-2">
          {logo && !fromLogo && (
            <Button ref={logoButton} size="sm" onClick={() => setFromLogo(true)}>
              <ShieldIcon size={16} />
              {t("fromLogo")}
            </Button>
          )}
          {Dropper && (
            <Button size="sm" onClick={() => void fromScreen()}>
              <EyedropperIcon size={16} />
              {t("fromScreen")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  logo,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The crest these colours belong to: its colours are offered, and it can be picked from. */
  logo?: string | null;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }
  const id = useId();
  const t = useTranslations("ui");

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <div className="flex h-10 items-stretch rounded-[3px] border-2 border-ink/30 bg-paper transition-[border-color,box-shadow] focus-within:border-ink focus-within:shadow-[3px_3px_0_var(--card)] hover:border-ink/60">
        <Popover.Root>
          <Popover.Trigger
            aria-label={t("color.pick", { label: label.toLowerCase() })}
            className="m-1 w-8 shrink-0 rounded-[2px] border-2 border-ink/80"
            style={{ background: value }}
          />
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} align="start" collisionPadding={8} className="z-50">
              <Popover.Popup className="flex w-64 flex-col gap-3 rounded-[4px] border-2 border-edge bg-paper p-3 shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                <ColorPopup value={value} onChange={onChange} logo={logo} />
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
  const t = useTranslations("ui.image");

  async function take(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await readImage(file, purpose));
    } catch (err) {
      toast.error(err instanceof ImageError ? t(err.code) : t("failed"));
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
            {value ? t("replace") : t("upload")}
          </Button>
          {value && (
            <Button
              variant="danger"
              size="icon"
              aria-label={t("remove", { label: label.toLowerCase() })}
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
  const t = useTranslations("ui.crest");
  return (
    <div className="flex flex-col gap-2">
      <ImageField
        label={t("label")}
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
          <span className="min-w-0 flex-1">{bg.light ? t("onWhite") : t("onSolid")}</span>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                onChange(await removeCrestBackground(value, bg), "transparent");
                toast.success(t("removed"));
              } catch {
                toast.error(t("removeFailed"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {bg.light ? t("removeWhite") : t("remove")}
          </Button>
        </div>
      )}
    </div>
  );
}
