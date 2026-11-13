"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  DotsSixVerticalIcon,
  XIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, Section, Segmented, Select } from "@/components/ui/controls";
import { RovingList } from "@/components/ui/roving";
import { FORMATIONS, formationSlots, TEAM_SIZES } from "@/lib/formation";
import { FIELD } from "@/lib/issues";
import { useActiveTeam, useStudio, useUi } from "@/lib/store";
import type { Player, Position, TeamSize } from "@/lib/types";

const ROLE: Record<Position, string> = { GK: "GK", DF: "DEF", MF: "MID", FW: "ATT" };

function useListSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function SortableRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return (
    <li
      ref={setNodeRef}
      data-row
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={clsx(
        "flex h-11 items-center gap-1 rounded-md border bg-paper pr-1 text-sm",
        isDragging ? "relative z-10 border-ink shadow-lg" : "border-rule",
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        data-cell
        className="grid h-full w-8 shrink-0 cursor-grab touch-none place-items-center text-ink-soft hover:text-ink active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <DotsSixVerticalIcon size={18} weight="bold" />
      </button>
      {children}
    </li>
  );
}

const inlineInput =
  "h-8 min-w-0 rounded-[5px] border border-transparent bg-transparent px-1.5 text-sm text-ink transition-colors hover:border-rule focus:border-ink focus:bg-paper focus:outline-none";

/** Number and name, edited in place. Changes go to the squad, so every graphic updates. */
function PlayerLabel({ player }: { player: Player }) {
  const updatePlayer = useStudio((st) => st.updatePlayer);
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <input
        data-cell
        aria-label={`Shirt number for ${player.name || "player"}`}
        inputMode="numeric"
        maxLength={3}
        value={player.number}
        onChange={(e) => updatePlayer(player.id, { number: e.target.value.replace(/\D/g, "") })}
        className={clsx(inlineInput, "w-9 text-center font-semibold text-ink-soft tabular-nums")}
      />
      <input
        data-cell
        aria-label={player.name ? `Name: ${player.name}` : "Player name"}
        value={player.name}
        placeholder="Player name"
        onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
        className={clsx(inlineInput, "flex-1 placeholder:text-ink-soft")}
      />
    </span>
  );
}

/** Squad players matching what has been typed, best first: number, start of name, then anywhere. */
function matchPlayers(players: Player[], raw: string): Player[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const rank = (p: Player) => {
    const name = p.name.toLowerCase();
    const shirt = p.shirtName?.toLowerCase() ?? "";
    if (/^\d+$/.test(q)) return p.number === q ? 0 : -1;
    if (name === q || shirt === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.split(/[\s-]+/).some((w) => w.startsWith(q)) || shirt.startsWith(q)) return 2;
    if (name.includes(q)) return 3;
    return -1;
  };
  return players
    .map((p) => ({ p, r: rank(p) }))
    .filter((m) => m.r >= 0)
    .sort((a, b) => a.r - b.r || a.p.name.localeCompare(b.p.name))
    .slice(0, 6)
    .map((m) => m.p);
}

/**
 * Type a name to fill a slot or the bench. Suggests free squad players as you type and
 * Enter picks the best one. A new player is only added to the squad when that option
 * ("Add … as a new player") is the one chosen, so "Callum" never duplicates Callum Price.
 */
function NameEntry({
  target,
  candidates,
  placeholder,
  listId: base,
  id,
  cell = false,
}: {
  target: number | "bench";
  candidates: Player[];
  placeholder: string;
  listId: string;
  id?: string;
  /** Part of a roving list (see RovingList). */
  cell?: boolean;
}) {
  const own = useId();
  const listId = `${base}-${own}`;
  const placeByName = useStudio((st) => st.placeByName);
  const assignSlot = useStudio((st) => st.assignSlot);
  const selectPlayer = useStudio((st) => st.selectPlayer);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = value.trim();
  const matches = matchPlayers(candidates, typed);
  // The last option adds a new player, unless the typed name is exactly a squad player.
  const exact = matches.some((p) => p.name.trim().toLowerCase() === typed.toLowerCase());
  const options: ({ kind: "player"; player: Player } | { kind: "new" })[] = [
    ...matches.map((player) => ({ kind: "player" as const, player })),
    ...(typed && !exact && !/^\d+$/.test(typed) ? [{ kind: "new" as const }] : []),
  ];
  const showList = open && typed.length > 0 && options.length > 0;
  const current = Math.min(active, options.length - 1);

  function choose(i: number) {
    const o = options[i];
    if (!o) return;
    if (o.kind === "player") {
      if (target === "bench") selectPlayer(o.player.id, "bench");
      else assignSlot(target, o.player.id);
      toast.success(`${o.player.name} ${target === "bench" ? "is on the bench" : "is in the XI"}`);
    } else {
      placeByName(typed, target);
      toast.success(`Added ${typed} to the squad`);
    }
    setValue("");
    setOpen(false);
    setActive(0);
  }

  return (
    <span className="relative flex min-w-0 flex-1">
      <input
        id={id}
        data-cell={cell || undefined}
        role="combobox"
        aria-label={placeholder}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={showList ? `${listId}-${current}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        // Leaving the field never adds anyone; the typed text stays for later.
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!typed) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            // While suggesting, the arrows walk the list instead of the rows.
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
            const step = e.key === "ArrowDown" ? 1 : -1;
            setActive((current + step + options.length) % options.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(current);
          } else if (e.key === "Escape" && showList) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className={clsx(
          inlineInput,
          "w-full border-dashed border-rule placeholder:text-ink-soft focus:border-solid",
        )}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Squad players"
          className="absolute top-full right-0 left-0 z-30 mt-1 flex flex-col border-2 border-card-ink bg-paper py-1 text-sm shadow-[3px_3px_0_var(--edge)]"
        >
          {options.map((o, i) => (
            <li
              key={o.kind === "player" ? o.player.id : "new"}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === current}
              // Keep focus in the input so the choice lands before blur closes the list.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              onMouseEnter={() => setActive(i)}
              className={clsx(
                "flex cursor-pointer items-center gap-2 px-2 py-1.5",
                i === current && "bg-card text-card-ink",
              )}
            >
              {o.kind === "player" ? (
                <>
                  <span className="w-6 text-right font-semibold tabular-nums">
                    {o.player.number || "–"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.player.name}</span>
                  <span className="text-[11px] opacity-70">{ROLE[o.player.position]}</span>
                </>
              ) : (
                <>
                  <span className="w-6 text-right font-bold">+</span>
                  <span className="min-w-0 flex-1 truncate">
                    Add &lsquo;{typed}&rsquo; as a new player
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

export function LineupPanel() {
  const team = useActiveTeam();
  const { lineup, players } = team;
  const s = useStudio.getState;
  const setTeamSize = useStudio((st) => st.setTeamSize);
  const setFormation = useStudio((st) => st.setFormation);
  const sensors = useListSensors();

  const byId = new Map(players.map((p) => [p.id, p]));
  const slots = formationSlots(lineup.formation, lineup.size);
  const used = new Set([...lineup.starters.filter(Boolean), ...lineup.bench] as string[]);
  const unpicked = players.filter((p) => !used.has(p.id));
  const starterCount = lineup.starters.filter(Boolean).length;
  const hasOverrides = Object.keys(lineup.overrides).length > 0;
  const free = [
    ...unpicked,
    ...lineup.bench.map((b) => byId.get(b)).filter((p): p is Player => !!p),
  ];
  const listId = useId();
  const setPanel = useUi((st) => st.setPanel);
  const keysHint = useId();

  // Sortable ids must be unique and stable; empty slots get a slot-based id.
  const starterIds = lineup.starters.map((id, i) => id ?? `empty-${i}`);
  const firstEmpty = lineup.starters.findIndex((id) => !id);

  function onStartersEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    s().moveStarter(starterIds.indexOf(String(e.active.id)), starterIds.indexOf(String(e.over.id)));
  }
  function onBenchEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    s().moveBench(
      lineup.bench.indexOf(String(e.active.id)),
      lineup.bench.indexOf(String(e.over.id)),
    );
  }

  const formationItems = FORMATIONS[lineup.size].map((f) => ({ value: f, label: f }));
  if (!formationItems.some((f) => f.value === lineup.formation)) {
    formationItems.unshift({ value: lineup.formation, label: lineup.formation });
  }

  return (
    <>
      <Section title="Shape">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">Players per side</span>
          <Segmented<`${TeamSize}`>
            label="Players per side"
            value={`${lineup.size}`}
            onChange={(v) => setTeamSize(Number(v) as TeamSize)}
            options={TEAM_SIZES.map((n) => ({
              value: `${n}` as `${TeamSize}`,
              label: `${n}`,
              title: `${n}-a-side`,
            }))}
          />
        </div>
        <div className="flex items-end gap-2">
          <Select
            label="Formation"
            value={lineup.formation}
            items={formationItems}
            onChange={setFormation}
            className="flex-1"
          />
          {hasOverrides && (
            <Button onClick={() => s().clearOverrides()} title="Undo pitch drags">
              <ArrowCounterClockwiseIcon size={16} />
              Reset positions
            </Button>
          )}
        </div>
      </Section>

      <Section
        title={`Starting ${lineup.size === 11 ? "XI" : lineup.size} (${starterCount}/${lineup.size})`}
      >
        <p id={keysHint} className="-mt-2 text-xs text-ink-soft">
          Type a name into an empty slot, or click any name to change it. Drag the handle to swap
          positions; the order runs from goalkeeper to attack, left to right. With a keyboard, the
          arrow keys move around the list.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onStartersEnd}>
          <SortableContext items={starterIds} strategy={verticalListSortingStrategy}>
            <RovingList as="ol" aria-describedby={keysHint} className="flex flex-col gap-1.5">
              {lineup.starters.map((id, i) => {
                const player = id ? byId.get(id) : undefined;
                const role = ROLE[slots[i]?.role ?? "MF"];
                return (
                  <SortableRow key={starterIds[i]} id={starterIds[i]}>
                    <span className="w-9 shrink-0 text-[11px] font-semibold text-ink-soft">
                      {role}
                    </span>
                    {player ? (
                      <>
                        <PlayerLabel player={player} />
                        <button
                          type="button"
                          data-cell
                          aria-pressed={lineup.captainId === player.id}
                          aria-label={`Make ${player.name} captain`}
                          title="Captain"
                          onClick={() =>
                            s().setCaptain(lineup.captainId === player.id ? null : player.id)
                          }
                          className={clsx(
                            "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors",
                            lineup.captainId === player.id
                              ? "bg-card text-card-ink"
                              : "text-ink-soft hover:bg-well hover:text-ink",
                          )}
                        >
                          C
                        </button>
                        <Button
                          data-cell
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`Move ${player.name} to the bench`}
                          title="Move to bench"
                          onClick={() => s().selectPlayer(player.id, "bench")}
                        >
                          <ArrowDownIcon size={15} />
                        </Button>
                      </>
                    ) : (
                      <NameEntry
                        cell
                        target={i}
                        candidates={free}
                        listId={listId}
                        id={i === firstEmpty ? FIELD.starters : undefined}
                        placeholder={`Add ${slots[i]?.role === "GK" ? "goalkeeper" : "player"}`}
                      />
                    )}
                  </SortableRow>
                );
              })}
            </RovingList>
          </SortableContext>
        </DndContext>
      </Section>

      <Section title={`Bench (${lineup.bench.length})`}>
        {lineup.bench.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBenchEnd}>
            <SortableContext items={lineup.bench} strategy={verticalListSortingStrategy}>
              <RovingList
                as="ol"
                aria-label="Bench, arrow keys move around the list"
                className="flex flex-col gap-1.5"
              >
                {lineup.bench.map((id) => {
                  const player = byId.get(id);
                  if (!player) return null;
                  return (
                    <SortableRow key={id} id={id}>
                      <PlayerLabel player={player} />
                      <Button
                        data-cell
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Move ${player.name} into the starting line-up`}
                        title="Move to starting line-up"
                        onClick={() => {
                          if (!s().selectPlayer(id, "xi"))
                            toast("The starting line-up is full", {
                              description: "Move someone to the bench first.",
                            });
                        }}
                      >
                        <ArrowUpIcon size={15} />
                      </Button>
                      <Button
                        data-cell
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Leave ${player.name} out`}
                        title="Leave out"
                        onClick={() => s().selectPlayer(id, "out")}
                      >
                        <XIcon size={15} />
                      </Button>
                    </SortableRow>
                  );
                })}
              </RovingList>
            </SortableContext>
          </DndContext>
        )}
        <div className="flex h-11 items-center rounded-md pr-1 pl-9">
          <NameEntry
            target="bench"
            candidates={unpicked}
            listId={`${listId}-bench`}
            placeholder="Add a substitute"
          />
        </div>
      </Section>

      <Section title={`Not selected (${unpicked.length})`}>
        {players.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-md bg-well p-4 text-sm">
            <p className="text-ink-soft">
              Your squad is empty. Type names into the slots above, or paste your whole squad list
              in one go.
            </p>
            <Button size="sm" onClick={() => setPanel("squad")}>
              Open squad
            </Button>
          </div>
        ) : unpicked.length === 0 ? (
          <p className="text-sm text-ink-soft">Everyone in the squad has been picked.</p>
        ) : (
          <RovingList
            as="ul"
            aria-label="Not selected, arrow keys move around the list"
            className="flex flex-col gap-1.5"
          >
            {unpicked.map((p) => (
              <li
                key={p.id}
                data-row
                className="flex h-11 items-center gap-1 rounded-md bg-well pr-1 pl-2 text-sm"
              >
                <PlayerLabel player={p} />
                <Button
                  data-cell
                  size="sm"
                  variant="ghost"
                  aria-label={`Start ${p.name}`}
                  onClick={() => {
                    if (!s().selectPlayer(p.id, "xi"))
                      toast("The starting line-up is full", {
                        description: "Move someone to the bench first.",
                      });
                  }}
                >
                  Start
                </Button>
                <Button
                  data-cell
                  size="sm"
                  variant="ghost"
                  aria-label={`Put ${p.name} on the bench`}
                  onClick={() => s().selectPlayer(p.id, "bench")}
                >
                  Bench
                </Button>
              </li>
            ))}
          </RovingList>
        )}
      </Section>
    </>
  );
}
