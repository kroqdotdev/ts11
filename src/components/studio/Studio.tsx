"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowsOutIcon,
  CaretDownIcon,
  CaretUpIcon,
  ListNumbersIcon,
  PaintBrushIcon,
  SoccerBallIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { FORMATS } from "@/components/graphics/theme";
import { AccountButton } from "@/components/account/AccountButton";
import { AuthDialog } from "@/components/account/AuthDialog";
import { AuthToasts } from "@/components/account/AuthToasts";
import { SyncChip } from "@/components/account/SyncChip";
import { VerifyBanner } from "@/components/account/VerifyBanner";
import { Segmented } from "@/components/ui/controls";
import { Wordmark } from "@/components/Wordmark";
import { useActiveTeam, useHydrated, useStudio, useUi, type PanelId } from "@/lib/store";
import type { FormatId } from "@/lib/types";
import { ClubSetup } from "./ClubSetup";
import { DesignPanel } from "./DesignPanel";
import { ExportControls } from "./ExportControls";
import { LineupPanel } from "./LineupPanel";
import { MatchPanel } from "./MatchPanel";
import { SquadPanel } from "./SquadPanel";
import { IssuesBar, Stage } from "./Stage";
import { StudioSkeleton } from "./StudioSkeleton";
import { PixelWipe } from "./PixelWipe";
import { TeamMenu } from "./TeamMenu";
import { TemplateRail } from "./TemplateRail";

const PANELS: { value: PanelId; label: string; icon: ReactNode; body: ReactNode }[] = [
  {
    value: "lineup",
    label: "Line-up",
    icon: <ListNumbersIcon size={20} weight="bold" />,
    body: <LineupPanel />,
  },
  {
    value: "squad",
    label: "Squad",
    icon: <UsersThreeIcon size={20} weight="bold" />,
    body: <SquadPanel />,
  },
  {
    value: "match",
    label: "Match",
    icon: <SoccerBallIcon size={20} weight="bold" />,
    body: <MatchPanel />,
  },
  {
    value: "design",
    label: "Design",
    icon: <PaintBrushIcon size={20} weight="bold" />,
    body: <DesignPanel />,
  },
];

/** Keyboard shortcuts past the panel, which can hold dozens of controls. */
function SkipLinks() {
  const link =
    "pointer-events-none absolute top-2 left-2 z-[60] -translate-y-16 rounded-[4px] border-2 border-card-ink bg-card px-3 py-2 text-sm font-semibold text-card-ink opacity-0 shadow-[3px_3px_0_var(--card-ink)] focus:pointer-events-auto focus:translate-y-0 focus:opacity-100";
  /** The export button that is on screen (header on desktop, bottom bar on phones). */
  function toExport(e: React.MouseEvent) {
    e.preventDefault();
    const visible = [...document.querySelectorAll<HTMLElement>("[data-export-primary]")].find(
      (el) => el.offsetParent !== null,
    );
    visible?.focus();
  }
  return (
    <nav aria-label="Skip links">
      <a href="#studio-panel" className={link}>
        Skip to the editing panel
      </a>
      <a href="#studio-graphics" className={link}>
        Skip to the graphic picker
      </a>
      <a href="#studio-preview" className={link}>
        Skip to the preview
      </a>
      <a href="#studio-export" onClick={toExport} className={link}>
        Skip to download
      </a>
    </nav>
  );
}

/**
 * Phones: true while a text field in the panel has focus, so the sticky preview can
 * shrink out of the way of the field and the on-screen keyboard.
 */
function useTyping() {
  const [typing, setTyping] = useState(false);
  const isText = (el: EventTarget | null) =>
    el instanceof HTMLElement &&
    (el.matches("textarea, [contenteditable='true']") ||
      (el instanceof HTMLInputElement &&
        !["checkbox", "radio", "range", "button", "submit", "color", "file"].includes(el.type)));
  return {
    typing,
    onFocus: (e: FocusEvent) => setTyping(isText(e.target)),
    onBlur: (e: FocusEvent) => {
      if (!isText(e.relatedTarget)) setTyping(false);
    },
  };
}

function FormatPicker() {
  const format = useStudio((s) => s.design.format);
  const updateDesign = useStudio((s) => s.updateDesign);
  return (
    <Segmented<FormatId>
      label="Size"
      value={format}
      onChange={(f) => updateDesign({ format: f })}
      options={(Object.keys(FORMATS) as FormatId[]).map((f) => ({
        value: f,
        title: `${FORMATS[f].w} × ${FORMATS[f].h}`,
        label: (
          <>
            <span>{FORMATS[f].label}</span>
            <span className="text-[11px] tabular-nums opacity-60">{FORMATS[f].ratio}</span>
          </>
        ),
      }))}
      tone="grass"
    />
  );
}

export function Studio() {
  const hydrated = useHydrated();
  const panel = useUi((s) => s.panel);
  const setPanel = useUi((s) => s.setPanel);
  const onboarded = useStudio((s) => s.onboarded);
  const setupOpen = useUi((s) => s.setupOpen);
  const [preview, setPreview] = useState<"mini" | "normal">("normal");
  const [fullscreen, setFullscreen] = useState(false);
  const { typing, onFocus, onBlur } = useTyping();
  const previewRef = usePreviewHeight();
  const inSetup = !onboarded || setupOpen;
  // Leaving the club setup (a long page on phones) must land at the top of the studio,
  // not wherever the "Open the studio" button was scrolled to.
  useEffect(() => {
    if (hydrated && !inSetup) window.scrollTo(0, 0);
  }, [hydrated, inSetup]);
  if (!hydrated) return <StudioSkeleton />;
  if (inSetup) return <ClubSetup first={!onboarded} />;
  // While typing on a phone the preview drops to a strip so the field stays in view.
  const height = typing ? "mini" : preview;

  return (
    <div className="flex min-h-dvh flex-col bg-grass-deep lg:h-dvh lg:overflow-hidden">
      <SkipLinks />
      <StudioHeading />
      <PixelWipe />
      <header className="flex h-16 shrink-0 items-center gap-4 px-4 text-chalk lg:px-5">
        <Wordmark />
        <div className="hidden h-6 w-px bg-chalk/15 sm:block" />
        <div className="hidden sm:block">
          <TeamMenu />
        </div>
        <div className="ml-auto flex items-center gap-2 lg:gap-3">
          <SyncChip />
          <AccountButton />
          <div id="studio-export" className="hidden lg:block">
            <ExportControls />
          </div>
        </div>
      </header>
      <VerifyBanner />
      <AuthDialog />
      <AuthToasts />

      <div className="px-4 pb-3 sm:hidden">
        <TeamMenu />
      </div>

      {/* Desktop: panels on the left (first in the DOM, so first in tab order), rail and
          stage on the right. Phones reorder: rail, a sticky preview, the size picker,
          then the panels over a bottom bar. */}
      <div className="flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-[minmax(380px,420px)_1fr] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(380px,420px)_1fr_auto] xl:grid-rows-1">
        <aside
          id="studio-panel"
          tabIndex={-1}
          aria-label="Edit"
          onFocus={onFocus}
          onBlur={onBlur}
          className="studio-panel order-4 flex min-h-0 flex-col border-card-ink bg-paper outline-none lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:border-t-2 lg:border-r-2 xl:row-span-1"
        >
          <Tabs.Root
            value={panel}
            onValueChange={(v) => setPanel(v as PanelId)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-1.5 border-t-2 border-card-ink bg-well px-1.5 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:static lg:gap-2 lg:border-t-0 lg:border-b-2 lg:p-0 lg:px-2 lg:pt-2">
              <Tabs.List className="relative flex min-w-0 flex-1 gap-0.5 lg:gap-1">
                {PANELS.map((p) => (
                  <Tabs.Tab
                    key={p.value}
                    value={p.value}
                    className="relative flex h-12 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[4px] px-0.5 text-[11px] leading-none font-semibold whitespace-nowrap text-ink-soft transition-colors hover:text-ink data-active:bg-ink data-active:text-paper lg:-mb-[2px] lg:h-11 lg:flex-row lg:gap-2 lg:rounded-b-none lg:border-2 lg:border-transparent lg:px-2 lg:font-signage lg:text-[19px] lg:font-normal lg:data-active:border-card-ink lg:data-active:border-b-paper lg:data-active:bg-paper lg:data-active:text-ink"
                  >
                    <span aria-hidden className="lg:hidden">
                      {p.icon}
                    </span>
                    {p.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              <div className="shrink-0 lg:hidden">
                <ExportControls compact />
              </div>
            </div>
            {PANELS.map((p) => (
              <Tabs.Panel
                key={p.value}
                value={p.value}
                className="relative min-h-0 flex-1 pb-24 outline-none lg:scrollbar-thin lg:overflow-y-auto lg:pb-0"
              >
                {p.body}
              </Tabs.Panel>
            ))}
          </Tabs.Root>
        </aside>

        <div
          id="studio-graphics"
          tabIndex={-1}
          className="order-1 min-w-0 border-y-2 border-card-ink bg-grass-deep px-4 py-2 outline-none lg:order-none lg:col-start-2 lg:row-start-1 lg:px-6 lg:py-3 xl:col-start-3 xl:row-start-1 xl:min-h-0 xl:scrollbar-thin xl:overflow-y-auto xl:border-b-0 xl:border-l-2 xl:px-4 xl:py-4"
        >
          <TemplateRail />
        </div>

        <main
          id="studio-preview"
          ref={previewRef}
          tabIndex={-1}
          aria-label="Preview"
          className={clsx(
            "pixel-stage sticky top-0 z-20 order-2 flex min-w-0 flex-col gap-3 border-b-2 border-card-ink p-3 transition-[height] duration-300 ease-out-quint outline-none lg:static lg:order-none lg:col-start-2 lg:row-start-2 lg:h-auto lg:min-h-0 lg:gap-3 lg:border-b-0 lg:px-6 lg:pt-6 lg:pb-4 xl:row-start-1 xl:border-t-2",
            PREVIEW_H[height],
          )}
        >
          <div className="relative min-h-0 flex-1">
            <Stage />
          </div>
          {/* Phones: the preview's own controls sit in a strip under it, never on the artwork. */}
          <div className="-mt-1 flex shrink-0 items-center justify-end gap-1.5 lg:hidden">
            <PreviewButton
              label={height === "mini" ? "Show the preview" : "Shrink the preview"}
              onClick={() => setPreview(height === "mini" ? "normal" : "mini")}
            >
              {height === "mini" ? (
                <CaretDownIcon size={18} weight="bold" />
              ) : (
                <CaretUpIcon size={18} weight="bold" />
              )}
            </PreviewButton>
            <PreviewButton label="Full screen preview" onClick={() => setFullscreen(true)}>
              <ArrowsOutIcon size={18} />
            </PreviewButton>
          </div>
          {/* One row under the stage, so the graphic gets the height. */}
          <div className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:flex">
            <FormatPicker />
            <IssuesBar />
          </div>
        </main>

        <div className="order-3 scrollbar-none flex justify-center overflow-x-auto bg-grass-deep px-3 py-3 lg:hidden">
          <FormatPicker />
        </div>
      </div>
      <FullscreenPreview open={fullscreen} onOpenChange={setFullscreen} />
    </div>
  );
}

/** The page's heading for screen readers; the wordmark and club menu are the visible ones. */
function StudioHeading() {
  const team = useActiveTeam();
  return <h1 className="sr-only">Studio: {team.name || "your club"}</h1>;
}

/**
 * Publishes the phone preview's height as --preview-h, so fields scrolled into view
 * (scroll-margin-top in globals.css) land below it, not under it.
 */
function usePreviewHeight() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const wide = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      const h = wide.matches ? 0 : el.getBoundingClientRect().height;
      root.style.setProperty("--preview-h", `${Math.round(h)}px`);
    };
    update();
    const ro = new ResizeObserver(() => {
      update();
      // The preview just shrank for typing (or grew back): keep the field in view.
      const active = document.activeElement;
      if (!wide.matches && active instanceof HTMLElement && active.closest(".studio-panel"))
        active.scrollIntoView({ block: "nearest" });
    });
    ro.observe(el);
    wide.addEventListener("change", update);
    return () => {
      ro.disconnect();
      wide.removeEventListener("change", update);
      root.style.removeProperty("--preview-h");
    };
  });
  return ref;
}

/** Phones: the graphic edge to edge, as big as the screen allows. */
function FullscreenPreview({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Popup
          aria-label="Full screen preview"
          className="pixel-stage fixed inset-0 z-50 flex flex-col transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b-2 border-card-ink bg-grass-deep px-3 pt-[env(safe-area-inset-top)]">
            <BaseDialog.Title className="font-signage text-[22px] leading-none text-chalk">
              Preview
            </BaseDialog.Title>
            <BaseDialog.Close
              aria-label="Close the full screen preview"
              className="grid size-11 place-items-center rounded-[4px] border-2 border-card-ink bg-paper text-ink shadow-[3px_3px_0_var(--card-ink)]"
            >
              <XIcon size={20} weight="bold" />
            </BaseDialog.Close>
          </div>
          <div className="min-h-0 flex-1 px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Stage exportable={false} />
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

/** Phone preview heights: a strip (also used while typing) and the default. */
const PREVIEW_H = { mini: "h-[19dvh]", normal: "h-[52dvh]" } as const;

function PreviewButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-[4px] border-2 border-card-ink bg-paper text-ink shadow-[3px_3px_0_var(--card-ink)]"
    >
      {children}
    </button>
  );
}
