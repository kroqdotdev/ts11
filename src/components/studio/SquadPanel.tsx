"use client";

import { ClipboardTextIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  Section,
  Segmented,
  Select,
  TextArea,
  TextField,
  TextInput,
} from "@/components/ui/controls";
import { KitWarning } from "@/components/setup/KitWarning";
import { SquadPreview } from "@/components/setup/SquadPreview";
import { ColorField, CrestField } from "@/components/ui/media";
import { initials } from "@/lib/format";
import { graphicsLanguage } from "@/lib/language";
import { readSquad } from "@/lib/squad";
import { useActiveTeam, useStudio } from "@/lib/store";
import type { Language, Player, Position } from "@/lib/types";

const POSITIONS: Position[] = ["GK", "DF", "MF", "FW"];

/** Each language named in itself, as in the language switch. */
const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "da", label: "Dansk" },
];

function PasteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const addPlayers = useStudio((s) => s.addPlayers);
  const [text, setText] = useState("");
  const [restored, setRestored] = useState<string[]>([]);
  const t = useTranslations("studio.squad");
  const { players: parsed, ignored } = readSquad(text, new Set(restored));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("pasteTitle")}
      description={t("pasteBody")}
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            disabled={parsed.length === 0}
            onClick={() => {
              addPlayers(parsed);
              toast.success(t("added", { count: parsed.length }));
              setText("");
              setRestored([]);
              onOpenChange(false);
            }}
          >
            {t("addCount", { count: parsed.length })}
          </Button>
        </>
      }
    >
      <TextArea
        aria-label={t("list")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("pastePlaceholder")}
        className="font-mono text-[13px]"
      />
      {(parsed.length > 0 || ignored.length > 0) && (
        <SquadPreview
          players={parsed}
          ignored={ignored}
          onRestore={(key) => setRestored((r) => [...r, key])}
          className="max-h-56 scrollbar-thin overflow-y-auto pr-1"
        />
      )}
    </Dialog>
  );
}

function PlayerRow({ player }: { player: Player }) {
  const updatePlayer = useStudio((s) => s.updatePlayer);
  const removePlayer = useStudio((s) => s.removePlayer);
  const restorePlayer = useStudio((s) => s.restorePlayer);
  const t = useTranslations("studio");
  const named = player.name.trim();
  return (
    <li className="grid grid-cols-[3.25rem_1fr_5.5rem_2.25rem] items-center gap-2">
      <TextInput
        aria-label={t("squad.number")}
        inputMode="numeric"
        value={player.number}
        maxLength={3}
        onChange={(e) => updatePlayer(player.id, { number: e.target.value.replace(/[^\d]/g, "") })}
        className="px-0 text-center font-semibold tabular-nums"
      />
      <TextInput
        aria-label={t("squad.playerName")}
        value={player.name}
        placeholder={t("squad.fullName")}
        onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
      />
      <Select
        label={t("squad.position")}
        hideLabel
        value={player.position}
        items={POSITIONS.map((p) => ({ value: p, label: t(`positions.${p}`) }))}
        onChange={(position) => updatePlayer(player.id, { position })}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={named ? t("squad.remove", { name: named }) : t("squad.removePlayer")}
        onClick={() => {
          const removed = removePlayer(player.id);
          if (!removed) return;
          toast(named ? t("squad.removed", { name: named }) : t("squad.removedNoName"), {
            action: { label: t("squad.undo"), onClick: () => restorePlayer(removed) },
            duration: 8000,
          });
        }}
      >
        <TrashIcon size={16} />
      </Button>
    </li>
  );
}

export function SquadPanel() {
  const team = useActiveTeam();
  const updateTeam = useStudio((s) => s.updateTeam);
  const addPlayer = useStudio((s) => s.addPlayer);
  const [pasting, setPasting] = useState(false);
  const t = useTranslations("studio.squad");

  // Kept in entry order so rows don't jump while a number is being typed.
  const sorted = team.players;

  return (
    <>
      <Section title={t("club")}>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <TextField
            label={t("name")}
            value={team.name}
            onChange={(name) => updateTeam({ name })}
          />
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
            onChange={(primary) => updateTeam({ colors: { ...team.colors, primary } })}
          />
          <ColorField
            label={t("second")}
            value={team.colors.secondary}
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

      <Section
        title={t("players", { count: team.players.length })}
        action={
          <Button size="sm" variant="ghost" onClick={() => setPasting(true)}>
            <ClipboardTextIcon size={16} />
            {t("paste")}
          </Button>
        }
      >
        {sorted.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {sorted.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-1 rounded-md bg-well p-4 text-sm">
            <p className="font-medium">{t("empty")}</p>
            <p className="text-ink-soft">{t("emptyHint")}</p>
          </div>
        )}
        <Button onClick={() => addPlayer()} className="self-start">
          <PlusIcon size={16} />
          {t("add")}
        </Button>
      </Section>
      <PasteDialog open={pasting} onOpenChange={setPasting} />
    </>
  );
}
