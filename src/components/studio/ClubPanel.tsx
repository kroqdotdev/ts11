"use client";

import { useTranslations } from "next-intl";
import { KitWarning } from "@/components/setup/KitWarning";
import { Section, Segmented, TextField } from "@/components/ui/controls";
import { ColorField, CrestField } from "@/components/ui/media";
import { initials } from "@/lib/format";
import { graphicsLanguage } from "@/lib/language";
import { useActiveTeam, useStudio } from "@/lib/store";
import type { Language } from "@/lib/types";

/** Each language named in itself, as in the language switch. */
const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "da", label: "Dansk" },
];

/** The club itself: name, crest, colours and the language its graphics print in. */
export function ClubPanel() {
  const team = useActiveTeam();
  const updateTeam = useStudio((s) => s.updateTeam);
  const t = useTranslations("studio.club");

  return (
    <Section title={t("title")}>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <TextField label={t("name")} value={team.name} onChange={(name) => updateTeam({ name })} />
        <TextField
          label={t("short")}
          value={team.shortName}
          maxLength={6}
          onChange={(shortName) => updateTeam({ shortName: shortName.toUpperCase() })}
          placeholder={initials(team.name)}
        />
      </div>
      <CrestField
        hint={t("crestHint")}
        value={team.crest}
        onChange={(crest, crestKind) => updateTeam({ crest, crestKind })}
      />
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label={t("main")}
          value={team.colors.primary}
          logo={team.crest}
          onChange={(primary) => updateTeam({ colors: { ...team.colors, primary } })}
        />
        <ColorField
          label={t("second")}
          value={team.colors.secondary}
          logo={team.crest}
          onChange={(secondary) => updateTeam({ colors: { ...team.colors, secondary } })}
        />
      </div>
      <KitWarning
        colors={team.colors}
        onSecondary={(secondary) => updateTeam({ colors: { ...team.colors, secondary } })}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">{t("language")}</span>
        <Segmented<Language>
          label={t("language")}
          value={graphicsLanguage(team)}
          onChange={(language) => updateTeam({ language })}
          options={LANGUAGES.map((l) => ({ ...l, label: <span lang={l.value}>{l.label}</span> }))}
        />
        <p className="text-xs leading-snug text-ink-soft">{t("languageHint")}</p>
      </div>
    </Section>
  );
}
