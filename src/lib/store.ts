"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { blankTeam, defaultDesign, defaultMatch, demoTeam } from "./demo";
import { FORMATIONS, formationSlots } from "./formation";
import { uid } from "./id";
import type {
  BackgroundPhoto,
  Fixture,
  Substitution,
  Design,
  Goal,
  GraphicKind,
  Lineup,
  Match,
  Player,
  Team,
  TeamSize,
} from "./types";

export const STORAGE_KEY = "teamsheet11:v1";
/** Key used before the rename; read once so nobody loses their squad. */
const LEGACY_KEY = "matchsheet:v1";

interface Snapshot {
  teams: Team[];
  activeTeamId: string;
  design: Design;
  /** False until the first-run club setup is finished or skipped. */
  onboarded: boolean;
}

interface Actions {
  setActiveTeam: (id: string) => void;
  addTeam: () => void;
  removeTeam: (id: string) => void;
  updateTeam: (
    patch: Partial<Pick<Team, "name" | "shortName" | "crest" | "crestKind" | "colors">>,
  ) => void;

  addPlayer: (player?: Partial<Player>) => string;
  /** Adds pasted players; one marked `captain` becomes captain if the team has none. */
  addPlayers: (players: (Omit<Player, "id"> & { captain?: boolean })[]) => void;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  /** Removes a player everywhere; returns what `restorePlayer` needs to undo it. */
  removePlayer: (id: string) => RemovedPlayer | null;
  restorePlayer: (removed: RemovedPlayer) => void;

  setTeamSize: (size: TeamSize) => void;
  setFormation: (formation: string) => void;
  selectPlayer: (id: string, where: "xi" | "bench" | "out") => boolean;
  assignSlot: (slot: number, playerId: string | null) => void;
  moveStarter: (from: number, to: number) => void;
  moveBench: (from: number, to: number) => void;
  setCaptain: (id: string | null) => void;
  /**
   * Puts a player into a starting slot or on the bench by name, reusing a squad
   * player with that name or adding a new one to the squad.
   */
  placeByName: (name: string, target: number | "bench") => void;
  setOverride: (slot: number, pos: { x: number; y: number }) => void;
  clearOverrides: () => void;

  updateMatch: (patch: Partial<Match>) => void;
  addGoal: (side: Goal["side"]) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;

  updateDesign: (patch: Partial<Design>) => void;
  updateBackground: (patch: Partial<BackgroundPhoto>) => void;
  setHeadline: (kind: GraphicKind, text: string) => void;

  addFixture: () => void;
  updateFixture: (id: string, patch: Partial<Fixture>) => void;
  removeFixture: (id: string) => void;
  addSub: () => void;
  updateSub: (id: string, patch: Partial<Substitution>) => void;
  removeSub: (id: string) => void;

  /** Saves a club from the setup wizard. `replace` drops the example club. */
  completeSetup: (team: Team, replace: boolean) => void;
  skipSetup: () => void;

  replaceAll: (snapshot: Omit<Snapshot, "onboarded">) => void;
  resetAll: () => void;
}

export type StudioState = Snapshot & Actions;

/** A removed player and where they were, so Undo can put them back. */
export interface RemovedPlayer {
  teamId: string;
  player: Player;
  index: number;
  slot: number;
  bench: number;
  captain: boolean;
}

function initial(): Snapshot {
  const team = demoTeam();
  return { teams: [team], activeTeamId: team.id, design: defaultDesign(), onboarded: false };
}

let warnedQuota = false;
let pending: { name: string; value: string } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Writes any pending change to localStorage straight away (e.g. before navigating). */
export function flushStorage() {
  writeNow();
}

function writeNow() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!pending) return;
  const { name, value } = pending;
  pending = null;
  try {
    localStorage.setItem(name, value);
    warnedQuota = false;
  } catch {
    if (!warnedQuota) {
      warnedQuota = true;
      toast.error("Browser storage is full", {
        description: "Your last change was not saved. Remove a large photo and try again.",
      });
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", writeNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") writeNow();
  });
}

/** localStorage with writes batched, so drags and typing don't serialise megabytes per frame. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name) ?? localStorage.getItem(LEGACY_KEY);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    pending = { name, value };
    if (timer) clearTimeout(timer);
    timer = setTimeout(writeNow, 350);
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* storage unavailable */
    }
  },
};

function resizeStarters(starters: (string | null)[], size: number): (string | null)[] {
  const next = starters.slice(0, size);
  while (next.length < size) next.push(null);
  return next;
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => {
      /** Applies `fn` to the active team. */
      const withTeam = (fn: (team: Team) => Team) =>
        set((s) => ({ teams: s.teams.map((t) => (t.id === s.activeTeamId ? fn(t) : t)) }));
      const withLineup = (fn: (lineup: Lineup, team: Team) => Lineup) =>
        withTeam((t) => ({ ...t, lineup: fn(t.lineup, t) }));

      return {
        ...initial(),

        setActiveTeam: (id) => set({ activeTeamId: id }),
        addTeam: () => {
          const team = blankTeam(uid());
          set((s) => ({ teams: [...s.teams, team], activeTeamId: team.id }));
        },
        removeTeam: (id) =>
          set((s) => {
            const teams = s.teams.filter((t) => t.id !== id);
            if (teams.length === 0) teams.push(blankTeam(uid()));
            return {
              teams,
              activeTeamId: s.activeTeamId === id ? teams[0].id : s.activeTeamId,
            };
          }),
        updateTeam: (patch) => withTeam((t) => ({ ...t, ...patch })),

        addPlayer: (player = {}) => {
          const id = uid();
          withTeam((t) => {
            const used = new Set(t.players.map((p) => Number(p.number)));
            let n = 1;
            while (used.has(n)) n++;
            return {
              ...t,
              players: [
                ...t.players,
                { id, name: "", number: String(n), position: "MF", ...player },
              ],
            };
          });
          return id;
        },
        addPlayers: (incoming) =>
          withTeam((t) => {
            const added = incoming.map((p) => ({
              id: uid(),
              name: p.name,
              number: p.number,
              position: p.position,
              captain: !!p.captain,
            }));
            const captain = added.find((p) => p.captain)?.id;
            return {
              ...t,
              players: [...t.players, ...added.map(({ captain: _c, ...p }) => p)],
              lineup: {
                ...t.lineup,
                captainId: t.lineup.captainId ?? captain ?? null,
              },
            };
          }),
        updatePlayer: (id, patch) =>
          withTeam((t) => ({
            ...t,
            players: t.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          })),
        removePlayer: (id) => {
          const team = get().teams.find((t) => t.id === get().activeTeamId);
          const index = team?.players.findIndex((p) => p.id === id) ?? -1;
          if (!team || index < 0) return null;
          const removed: RemovedPlayer = {
            teamId: team.id,
            player: team.players[index],
            index,
            slot: team.lineup.starters.indexOf(id),
            bench: team.lineup.bench.indexOf(id),
            captain: team.lineup.captainId === id,
          };
          withTeam((t) => ({
            ...t,
            players: t.players.filter((p) => p.id !== id),
            lineup: {
              ...t.lineup,
              starters: t.lineup.starters.map((s) => (s === id ? null : s)),
              bench: t.lineup.bench.filter((b) => b !== id),
              captainId: t.lineup.captainId === id ? null : t.lineup.captainId,
            },
          }));
          return removed;
        },
        restorePlayer: (r) =>
          set((s) => ({
            teams: s.teams.map((t) => {
              if (t.id !== r.teamId || t.players.some((p) => p.id === r.player.id)) return t;
              const players = [...t.players];
              players.splice(Math.min(r.index, players.length), 0, r.player);
              const starters = [...t.lineup.starters];
              const bench = [...t.lineup.bench];
              // Back to the same spot, unless someone has taken it since; then the bench.
              if (r.slot >= 0 && r.slot < starters.length && !starters[r.slot])
                starters[r.slot] = r.player.id;
              else if (r.slot >= 0 || r.bench >= 0)
                bench.splice(
                  r.bench >= 0 ? Math.min(r.bench, bench.length) : bench.length,
                  0,
                  r.player.id,
                );
              return {
                ...t,
                players,
                lineup: {
                  ...t.lineup,
                  starters,
                  bench,
                  captainId: r.captain && !t.lineup.captainId ? r.player.id : t.lineup.captainId,
                },
              };
            }),
          })),

        setTeamSize: (size) =>
          withLineup((l) => ({
            ...l,
            size,
            formation: FORMATIONS[size][0],
            starters: resizeStarters(l.starters, size),
            bench: [...l.bench, ...(l.starters.slice(size).filter(Boolean) as string[])],
            overrides: {},
          })),
        setFormation: (formation) => withLineup((l) => ({ ...l, formation, overrides: {} })),
        selectPlayer: (id, where) => {
          const team = get().teams.find((t) => t.id === get().activeTeamId);
          if (!team) return false;
          const { lineup } = team;
          if (where === "xi" && !lineup.starters.includes(id) && !lineup.starters.includes(null)) {
            return false;
          }
          withLineup((l) => {
            const starters = l.starters.map((s) => (s === id ? null : s));
            const bench = l.bench.filter((b) => b !== id);
            if (where === "xi") {
              const already = l.starters.indexOf(id);
              if (already >= 0) starters[already] = id;
              else starters[starters.indexOf(null)] = id;
            }
            if (where === "bench") bench.push(id);
            return {
              ...l,
              starters,
              bench,
              captainId: where === "out" && l.captainId === id ? null : l.captainId,
            };
          });
          return true;
        },
        assignSlot: (slot, playerId) =>
          withLineup((l) => {
            const starters = [...l.starters];
            const previous = starters[slot];
            const from = playerId ? starters.indexOf(playerId) : -1;
            if (from >= 0) starters[from] = previous;
            starters[slot] = playerId;
            const bench = l.bench.filter((b) => b !== playerId);
            return { ...l, starters, bench };
          }),
        // Formation slots are positions, so a drag swaps two players rather than shifting the rest.
        moveStarter: (from, to) =>
          withLineup((l) => {
            const starters = [...l.starters];
            [starters[from], starters[to]] = [starters[to], starters[from]];
            return { ...l, starters };
          }),
        moveBench: (from, to) => withLineup((l) => ({ ...l, bench: arrayMove(l.bench, from, to) })),
        setCaptain: (id) => withLineup((l) => ({ ...l, captainId: id })),
        placeByName: (raw, target) => {
          const name = raw.trim();
          if (!name) return;
          const team = get().teams.find((t) => t.id === get().activeTeamId);
          if (!team) return;
          const existing = team.players.find(
            (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
          );
          const role =
            typeof target === "number"
              ? formationSlots(team.lineup.formation, team.lineup.size)[target]?.role
              : undefined;
          const id = existing?.id ?? get().addPlayer({ name, position: role ?? "MF" });
          if (target === "bench") get().selectPlayer(id, "bench");
          else get().assignSlot(target, id);
        },
        setOverride: (slot, pos) =>
          withLineup((l) => ({ ...l, overrides: { ...l.overrides, [slot]: pos } })),
        clearOverrides: () => withLineup((l) => ({ ...l, overrides: {} })),

        updateMatch: (patch) => withTeam((t) => ({ ...t, match: { ...t.match, ...patch } })),
        addGoal: (side) =>
          withTeam((t) => ({
            ...t,
            match: {
              ...t.match,
              goals: [...t.match.goals, { id: uid(), side, name: "", minute: "" }],
            },
          })),
        updateGoal: (id, patch) =>
          withTeam((t) => ({
            ...t,
            match: {
              ...t.match,
              goals: t.match.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
            },
          })),
        removeGoal: (id) =>
          withTeam((t) => ({
            ...t,
            match: { ...t.match, goals: t.match.goals.filter((g) => g.id !== id) },
          })),

        updateDesign: (patch) => set((s) => ({ design: { ...s.design, ...patch } })),
        updateBackground: (patch) =>
          set((s) => ({
            design: { ...s.design, background: { ...s.design.background, ...patch } },
          })),
        setHeadline: (kind, text) =>
          set((s) => ({
            design: { ...s.design, headlines: { ...s.design.headlines, [kind]: text } },
          })),

        addFixture: () =>
          withTeam((t) => ({
            ...t,
            fixtures: [
              ...t.fixtures,
              {
                id: uid(),
                opponent: "",
                isHome: true,
                date: t.fixtures.at(-1)?.date ?? t.match.date,
                kickoff: t.match.kickoff || "15:00",
                competition: "",
                score: "",
              },
            ],
          })),
        updateFixture: (id, patch) =>
          withTeam((t) => ({
            ...t,
            fixtures: t.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)),
          })),
        removeFixture: (id) =>
          withTeam((t) => ({ ...t, fixtures: t.fixtures.filter((f) => f.id !== id) })),
        addSub: () =>
          withTeam((t) => ({
            ...t,
            match: {
              ...t.match,
              subs: [...t.match.subs, { id: uid(), offId: null, onId: null, minute: "" }],
            },
          })),
        updateSub: (id, patch) =>
          withTeam((t) => ({
            ...t,
            match: {
              ...t.match,
              subs: t.match.subs.map((x) => (x.id === id ? { ...x, ...patch } : x)),
            },
          })),
        removeSub: (id) =>
          withTeam((t) => ({
            ...t,
            match: { ...t.match, subs: t.match.subs.filter((x) => x.id !== id) },
          })),

        completeSetup: (team, replace) =>
          set((s) => ({
            teams: replace ? [team] : [...s.teams, team],
            activeTeamId: team.id,
            onboarded: true,
            design: { ...s.design, footer: replace ? "" : s.design.footer },
          })),
        skipSetup: () => set({ onboarded: true }),

        replaceAll: (snapshot) => set({ ...snapshot, onboarded: true }),
        resetAll: () => set(initial()),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (s): Snapshot => ({
        onboarded: s.onboarded,
        teams: s.teams,
        activeTeamId: s.activeTeamId,
        design: s.design,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Snapshot> | undefined;
        if (!p?.teams?.length) return current;
        const blank = defaultMatch();
        return {
          ...current,
          ...p,
          // Saved before setup existed means the person already has a club.
          onboarded: p.onboarded ?? true,
          // Fill fields added in later versions so older saves keep working.
          teams: p.teams.map((t) => ({
            ...t,
            fixtures: t.fixtures ?? [],
            match: {
              ...t.match,
              // Older saves typed the score by hand; keep it unless it already matches the goals.
              autoScore: t.match.autoScore ?? autoScoreFits(t.match),
              htOurScore: t.match.htOurScore ?? 0,
              htTheirScore: t.match.htTheirScore ?? 0,
              spotlightGoalId: t.match.spotlightGoalId ?? null,
              subs: t.match.subs ?? blank.subs,
              motmId: t.match.motmId ?? null,
              motmNote: t.match.motmNote ?? "",
            },
          })),
          design: {
            ...current.design,
            ...p.design,
            headlines: { ...current.design.headlines, ...p.design?.headlines },
            background: { ...current.design.background, ...p.design?.background },
          },
        };
      },
    },
  ),
);

export function useActiveTeam(): Team {
  return useStudio((s) => s.teams.find((t) => t.id === s.activeTeamId) ?? s.teams[0]);
}

export function snapshotOf(s: StudioState): Snapshot {
  return { teams: s.teams, activeTeamId: s.activeTeamId, design: s.design, onboarded: true };
}

export function isSnapshot(value: unknown): value is Snapshot {
  const v = value as Snapshot;
  return (
    !!v &&
    Array.isArray(v.teams) &&
    v.teams.length > 0 &&
    typeof v.activeTeamId === "string" &&
    typeof v.design === "object"
  );
}

/** Interface state that should not be saved (which side panel is open). */
export type PanelId = "lineup" | "match" | "design" | "squad";
export const useUi = create<{
  panel: PanelId;
  setPanel: (panel: PanelId) => void;
  /** The club setup, opened again from the team menu to add another team. */
  setupOpen: boolean;
  setSetupOpen: (open: boolean) => void;
  /** Play the pixel wipe into the studio (straight after the club setup). */
  intro: boolean;
  setIntro: (intro: boolean) => void;
}>()((set) => ({
  panel: "lineup",
  setPanel: (panel) => set({ panel }),
  setupOpen: false,
  setSetupOpen: (setupOpen) => set({ setupOpen }),
  intro: false,
  setIntro: (intro) => set({ intro }),
}));

/** True once saved data has been read from this browser. Triggers the read if needed. */
export function useHydrated(): boolean {
  const hydrated = useSyncExternalStore(
    (notify) => useStudio.persist.onFinishHydration(notify),
    () => useStudio.persist.hasHydrated(),
    () => false,
  );
  useEffect(() => {
    if (!useStudio.persist.hasHydrated()) void useStudio.persist.rehydrate();
  }, []);
  return hydrated;
}

function autoScoreFits(m: Team["match"]): boolean {
  const us = m.goals.filter((g) => g.side === "us").length;
  const them = m.goals.filter((g) => g.side === "them").length;
  return us === m.ourScore && them === m.theirScore;
}
