"use client";

import { ClipboardTextIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  Section,
  Select,
  TextArea,
  TextField,
  TextInput,
} from "@/components/ui/controls";
import { KitWarning } from "@/components/setup/KitWarning";
import { SquadPreview } from "@/components/setup/SquadPreview";
import { ColorField, CrestField } from "@/components/ui/media";
import { initials } from "@/lib/format";
import { readSquad } from "@/lib/squad";
import { useActiveTeam, useStudio } from "@/lib/store";
import type { Player, Position } from "@/lib/types";

const POSITIONS: { value: Position; label: string }[] = [
  { value: "GK", label: "GK" },
  { value: "DF", label: "DEF" },
  { value: "MF", label: "MID" },
  { value: "FW", label: "ATT" },
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
  const { players: parsed, ignored } = readSquad(text, new Set(restored));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Paste a squad list"
      description="Straight from the team chat, messages and all. Shirt numbers, positions (GK, CB, MID, ST and so on) and (c) for the captain are picked up wherever they appear; chat lines are left out."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={parsed.length === 0}
            onClick={() => {
              addPlayers(parsed);
              toast.success(`Added ${parsed.length} ${parsed.length === 1 ? "player" : "players"}`);
              setText("");
              setRestored([]);
              onOpenChange(false);
            }}
          >
            Add {parsed.length || ""} {parsed.length === 1 ? "player" : "players"}
          </Button>
        </>
      }
    >
      <TextArea
        aria-label="Squad list"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"1 Tom Hadley GK\n2 Josh Okafor DEF\n10 Callum Price MID"}
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
  return (
    <li className="grid grid-cols-[3.25rem_1fr_5.5rem_2.25rem] items-center gap-2">
      <TextInput
        aria-label="Shirt number"
        inputMode="numeric"
        value={player.number}
        maxLength={3}
        onChange={(e) => updatePlayer(player.id, { number: e.target.value.replace(/[^\d]/g, "") })}
        className="px-0 text-center font-semibold tabular-nums"
      />
      <TextInput
        aria-label="Player name"
        value={player.name}
        placeholder="Full name"
        onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
      />
      <Select
        label="Position"
        hideLabel
        value={player.position}
        items={POSITIONS}
        onChange={(position) => updatePlayer(player.id, { position })}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${player.name || "player"}`}
        onClick={() => {
          const removed = removePlayer(player.id);
          if (!removed) return;
          toast(`Removed ${player.name || "player"}`, {
            action: { label: "Undo", onClick: () => restorePlayer(removed) },
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

  // Kept in entry order so rows don't jump while a number is being typed.
  const sorted = team.players;

  return (
    <>
      <Section title="Club">
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <TextField
            label="Team name"
            value={team.name}
            onChange={(name) => updateTeam({ name })}
          />
          <TextField
            label="Short name"
            value={team.shortName}
            maxLength={6}
            onChange={(shortName) => updateTeam({ shortName: shortName.toUpperCase() })}
            placeholder={initials(team.name)}
          />
        </div>
        <CrestField
          hint="Without one, a shield in your colours with your initials is used."
          value={team.crest}
          onChange={(crest, crestKind) => updateTeam({ crest, crestKind })}
        />
        <div className="grid grid-cols-2 gap-3">
          <ColorField
            label="Main colour"
            value={team.colors.primary}
            onChange={(primary) => updateTeam({ colors: { ...team.colors, primary } })}
          />
          <ColorField
            label="Second colour"
            value={team.colors.secondary}
            onChange={(secondary) => updateTeam({ colors: { ...team.colors, secondary } })}
          />
        </div>
        <KitWarning
          colors={team.colors}
          onSecondary={(secondary) => updateTeam({ colors: { ...team.colors, secondary } })}
        />
      </Section>

      <Section
        title={`Players (${team.players.length})`}
        action={
          <Button size="sm" variant="ghost" onClick={() => setPasting(true)}>
            <ClipboardTextIcon size={16} />
            Paste list
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
            <p className="font-medium">No players yet</p>
            <p className="text-ink-soft">
              Add them one at a time, or paste the list from your team chat.
            </p>
          </div>
        )}
        <Button onClick={() => addPlayer()} className="self-start">
          <PlusIcon size={16} />
          Add player
        </Button>
      </Section>
      <PasteDialog open={pasting} onOpenChange={setPasting} />
    </>
  );
}
