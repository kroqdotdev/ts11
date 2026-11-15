"use client";

import { ClipboardTextIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, Section, Select, TextArea, TextInput } from "@/components/ui/controls";
import { SquadPreview } from "@/components/setup/SquadPreview";
import { readSquad } from "@/lib/squad";
import { useActiveTeam, useStudio } from "@/lib/store";
import type { Player, Position } from "@/lib/types";

const POSITIONS: Position[] = ["GK", "DF", "MF", "FW"];

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
  const addPlayer = useStudio((s) => s.addPlayer);
  const [pasting, setPasting] = useState(false);
  const t = useTranslations("studio.squad");

  // Kept in entry order so rows don't jump while a number is being typed.
  const sorted = team.players;

  return (
    <>
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
