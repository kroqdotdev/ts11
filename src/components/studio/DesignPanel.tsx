"use client";

import { initials } from "@/lib/format";
import { CheckIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { DEFAULT_HEADLINES } from "@/lib/demo";
import { KIND_LABEL, KINDS } from "@/lib/kinds";
import { alpha, tonal } from "@/lib/color";
import { GRAPHIC_FONTS } from "@/lib/fonts";
import { useActiveTeam, useStudio } from "@/lib/store";
import type { FontId, GraphicKind, LookId, PhotoOverlay } from "@/lib/types";
import { buildTheme, LOOKS } from "@/components/graphics/theme";
import {
  radioGroupKeys,
  Section,
  Segmented,
  SliderField,
  SwitchRow,
  TextField,
} from "@/components/ui/controls";
import { ColorField, ImageField } from "@/components/ui/media";

const LOFI: LookId[] = ["pixel", "stadium"];

/** Whether an image is used on every graphic, or only on some. */
function ScopePicker({
  value,
  onChange,
  current,
}: {
  value: GraphicKind[] | null;
  onChange: (value: GraphicKind[] | null) => void;
  current: GraphicKind;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium">Use it on</span>
      <Segmented
        label="Use it on"
        value={value ? "some" : "all"}
        onChange={(v) => onChange(v === "all" ? null : [current])}
        options={[
          { value: "all", label: "Every graphic" },
          { value: "some", label: "Only some" },
        ]}
      />
      {value && (
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => {
            const on = value.includes(k.id);
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? value.filter((x) => x !== k.id) : [...value, k.id])}
                className={clsx(
                  "rounded-[4px] border-2 px-2 py-1 text-xs transition-colors",
                  on
                    ? "border-card-ink bg-card text-card-ink"
                    : "border-rule text-ink-soft hover:border-ink",
                )}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LookPicker() {
  const team = useActiveTeam();
  const design = useStudio((s) => s.design);
  const updateDesign = useStudio((s) => s.updateDesign);

  return (
    <div
      role="radiogroup"
      aria-label="Style"
      className="grid grid-cols-2 gap-2"
      onKeyDown={radioGroupKeys}
    >
      {(Object.keys(LOOKS) as LookId[]).map((look) => {
        const t = buildTheme({ ...design, look }, team.colors);
        const active = design.look === look;
        const dark = tonal(t.primary, 0.3);
        const swatches: Record<LookId, string> = {
          block: `linear-gradient(105deg, ${t.primary} 0 62%, ${t.secondary} 62% 66%, ${dark} 66%)`,
          stripes: `repeating-linear-gradient(90deg, ${t.primary} 0 12px, ${tonal(t.primary, 0.14)} 12px 24px)`,
          hoops: `repeating-linear-gradient(180deg, ${t.primary} 0 10px, ${tonal(t.primary, 0.16)} 10px 20px)`,
          halves: `linear-gradient(90deg, ${t.primary} 0 60%, ${t.secondary} 60% 63%, ${dark} 63%)`,
          sash: `linear-gradient(-35deg, ${t.primary} 0 40%, ${t.secondary} 40% 43%, ${dark} 43% 57%, ${t.secondary} 57% 60%, ${t.primary} 60%)`,
          night: `radial-gradient(80% 90% at 50% -10%, ${alpha(t.primary, 0.8)}, ${t.ground} 75%)`,
          clean: `linear-gradient(180deg, ${t.primary} 0 10%, ${t.secondary} 10% 14%, ${t.ground} 14%)`,
          pixel: `repeating-conic-gradient(${t.primary} 0 25%, ${tonal(t.primary, 0.14)} 0 50%) 0 0 / 16px 16px`,
          stadium: `linear-gradient(180deg, #2c3a6c 0 22%, #d0806c 22% 30%, #171c24 30% 34%, ${t.primary} 34% 44%, ${t.secondary} 44% 48%, ${t.primary} 48% 58%, #3a8846 58%)`,
        };
        const swatch = swatches[look];
        return (
          <button
            key={look}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() =>
              updateDesign(
                // The low-fi styles look best in the pixel face, so switch to it from the
                // default, and back again when leaving them.
                LOFI.includes(look) && design.font === "archivo"
                  ? { look, font: "jersey" }
                  : !LOFI.includes(look) && LOFI.includes(design.look) && design.font === "jersey"
                    ? { look, font: "archivo" }
                    : { look },
              )
            }
            className={clsx(
              "relative flex flex-col gap-2 rounded-[4px] border-2 p-1.5 text-left transition-[box-shadow,translate,border-color]",
              active
                ? "-translate-y-0.5 border-card-ink bg-card text-card-ink shadow-[4px_4px_0_var(--card-ink)]"
                : "border-rule hover:border-ink-soft hover:shadow-[2px_2px_0_var(--card-ink)]",
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute -top-2 -right-2 z-10 grid size-6 place-items-center rounded-[3px] border-2 border-card-ink bg-ink text-paper shadow-[2px_2px_0_var(--card-ink)]"
              >
                <CheckIcon size={14} weight="bold" />
              </span>
            )}
            <span
              className={clsx(
                "flex h-14 items-end rounded-[3px] p-2",
                active && "outline-2 outline-card-ink",
              )}
              style={{ background: swatch, color: t.fg, fontFamily: t.font.family }}
            >
              <span
                className="text-lg leading-none uppercase"
                style={{ fontWeight: t.font.heavy, fontStretch: t.font.stretch }}
              >
                XI
              </span>
            </span>
            <span className="px-1 pb-0.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {LOOKS[look].label}
                {active && (
                  <span className="rounded-[2px] bg-card-ink px-1 py-px font-signage text-[13px] leading-none font-normal text-card">
                    In use
                  </span>
                )}
              </span>
              <span
                className={clsx("block text-xs", active ? "text-card-ink/80" : "text-ink-soft")}
              >
                {LOOKS[look].hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FontPicker() {
  const font = useStudio((s) => s.design.font);
  const updateDesign = useStudio((s) => s.updateDesign);
  return (
    <div
      role="radiogroup"
      aria-label="Typeface"
      className="grid grid-cols-2 gap-2"
      onKeyDown={radioGroupKeys}
    >
      {(Object.keys(GRAPHIC_FONTS) as FontId[]).map((id) => {
        const f = GRAPHIC_FONTS[id];
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={font === id}
            tabIndex={font === id ? 0 : -1}
            onClick={() => updateDesign({ font: id })}
            className={clsx(
              "flex h-12 items-center justify-between rounded-md border px-3 transition-colors",
              font === id ? "border-ink bg-well" : "border-rule hover:border-ink-soft",
            )}
          >
            <span
              className="text-[22px] leading-none uppercase"
              style={{ fontFamily: f.family, fontWeight: f.heavy, fontStretch: f.stretch }}
            >
              Kick-off
            </span>
            <span className="text-[11px] text-ink-soft">{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DesignPanel() {
  const team = useActiveTeam();
  const design = useStudio((s) => s.design);
  const updateDesign = useStudio((s) => s.updateDesign);
  const updateBackground = useStudio((s) => s.updateBackground);
  const setHeadline = useStudio((s) => s.setHeadline);
  const colors = design.colors ?? team.colors;
  const bg = design.background;
  const isLineup = design.kind === "lineup" || design.kind === "pitch";

  return (
    <>
      <Section title="Style">
        <LookPicker />
        <FontPicker />
      </Section>

      <Section title="Colours">
        <SwitchRow
          label="Use club colours"
          hint="Turn off to use different colours on this graphic only."
          checked={design.colors === null}
          onChange={(on) => updateDesign({ colors: on ? null : { ...team.colors } })}
        />
        {design.colors && (
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="Main colour"
              value={colors.primary}
              onChange={(primary) => updateDesign({ colors: { ...colors, primary } })}
            />
            <ColorField
              label="Accent"
              value={colors.secondary}
              onChange={(secondary) => updateDesign({ colors: { ...colors, secondary } })}
            />
          </div>
        )}
      </Section>

      <Section title="Text">
        <TextField
          label={`${KIND_LABEL[design.kind]} headline`}
          value={design.headlines[design.kind]}
          placeholder={DEFAULT_HEADLINES[design.kind]}
          onChange={(text) => setHeadline(design.kind, text)}
        />
        <TextField
          label="Footer"
          hint="A hashtag, website or sponsor line."
          value={design.footer}
          onChange={(footer) => updateDesign({ footer })}
        />
      </Section>

      <Section title="Background photo">
        <ImageField
          label="Photo"
          hint="A player, the ground or the crowd. It fills the whole graphic, and the text sits on top."
          value={bg.image}
          purpose="photo"
          preview="cover"
          onChange={(image) => updateBackground({ image })}
        >
          <div className="mt-3 flex flex-col gap-4">
            <ScopePicker
              value={design.backgroundOn}
              current={design.kind}
              onChange={(backgroundOn) => updateDesign({ backgroundOn })}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Overlay</span>
              <Segmented<PhotoOverlay>
                label="Overlay"
                value={bg.overlay}
                onChange={(overlay) => updateBackground({ overlay })}
                options={[
                  {
                    value: "fade",
                    label: "Fade",
                    title: "Club colour fading in from the text side",
                  },
                  { value: "tint", label: "Tint", title: "Even club-colour wash" },
                  {
                    value: "duotone",
                    label: "Duotone",
                    title: "Photo printed in your club colour",
                  },
                  { value: "none", label: "None" },
                ]}
              />
            </div>
            {bg.overlay !== "none" && (
              <SliderField
                label="Overlay strength"
                value={bg.strength}
                onChange={(strength) => updateBackground({ strength })}
              />
            )}
            <SliderField
              label="Zoom"
              value={bg.zoom}
              min={1}
              max={2.5}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onChange={(zoom) => updateBackground({ zoom })}
            />
            <div className="grid grid-cols-2 gap-4">
              <SliderField
                label="Left to right"
                value={bg.x}
                min={0}
                max={100}
                step={1}
                format={(v) => `${Math.round(v)}%`}
                onChange={(x) => updateBackground({ x })}
              />
              <SliderField
                label="Top to bottom"
                value={bg.y}
                min={0}
                max={100}
                step={1}
                format={(v) => `${Math.round(v)}%`}
                onChange={(y) => updateBackground({ y })}
              />
            </div>
            {bg.overlay !== "duotone" && (
              <SwitchRow
                label="Black and white"
                checked={bg.mono}
                onChange={(mono) => updateBackground({ mono })}
              />
            )}
          </div>
        </ImageField>
      </Section>

      <Section title="Images">
        <ImageField
          label="Player cut-out"
          hint="A PNG with a transparent background works best. It stands on the right-hand side."
          value={design.featureImage}
          purpose="feature"
          onChange={(featureImage) => updateDesign({ featureImage })}
        >
          <div className="mt-3">
            <ScopePicker
              value={design.featureOn}
              current={design.kind}
              onChange={(featureOn) => updateDesign({ featureOn })}
            />
          </div>
        </ImageField>
        <ImageField
          label="Sponsor logo"
          value={design.sponsorImage}
          purpose="sponsor"
          onChange={(sponsorImage) => updateDesign({ sponsorImage })}
        />
      </Section>

      <Section title="Details">
        {isLineup && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Player names</span>
            <Segmented
              label="Player names"
              value={design.nameStyle}
              onChange={(nameStyle) => updateDesign({ nameStyle })}
              options={[
                { value: "initial", label: "C. Price" },
                { value: "surname", label: "Price" },
                { value: "full", label: "Callum Price" },
              ]}
            />
          </div>
        )}
        {design.kind === "pitch" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Player markers</span>
            <Segmented
              label="Player markers"
              value={design.tokenStyle}
              onChange={(tokenStyle) => updateDesign({ tokenStyle })}
              options={[
                { value: "shirt", label: "Shirts" },
                { value: "disc", label: "Discs" },
              ]}
            />
          </div>
        )}
        <div className="flex flex-col">
          {isLineup && (
            <>
              <SwitchRow
                label="Shirt numbers"
                checked={design.showNumbers}
                onChange={(showNumbers) => updateDesign({ showNumbers })}
              />
              <SwitchRow
                label="Substitutes"
                checked={design.showSubs}
                onChange={(showSubs) => updateDesign({ showSubs })}
              />
              <SwitchRow
                label="Captain's armband"
                checked={design.showCaptain}
                onChange={(showCaptain) => updateDesign({ showCaptain })}
              />
            </>
          )}
          <SwitchRow
            label="Background lettering"
            hint={`Your short name, ${team.shortName.trim() || initials(team.name)}, in outline`}
            checked={design.showLettering}
            onChange={(showLettering) => updateDesign({ showLettering })}
          />
        </div>
      </Section>
    </>
  );
}
