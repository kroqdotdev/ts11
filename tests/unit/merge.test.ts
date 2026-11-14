import { describe, expect, it } from "vitest";
import { hashOf } from "@/lib/sync/engine";
import { applyRemote, emptyMeta, planLink, type RemoteClub } from "@/lib/sync/merge";
import type { Team } from "@/lib/types";

const team = (id: string, name = id) => ({ id, name }) as Team;
const row = (t: Team, rev: number, deleted = false): RemoteClub => ({
  id: t.id,
  data: deleted ? {} : t,
  rev,
  deleted,
});
const metaWith = (known: Record<string, { rev: number; hash: string }>) => ({
  ...emptyMeta(),
  linked: true,
  known,
});

describe("planLink", () => {
  it("takes this browser's clubs into an empty account", () => {
    const plan = planLink([team("a")], true, null, "me", []);
    expect(plan).toMatchObject({ kind: "use", teams: [{ id: "a" }] });
  });

  it("ignores the example club of a browser that was never set up", () => {
    const plan = planLink([team("demo")], false, null, "me", [row(team("x"), 1)]);
    expect(plan).toMatchObject({ kind: "use", teams: [{ id: "x" }] });
  });

  it("asks when both sides have their own clubs", () => {
    const plan = planLink([team("a", "Ashby")], true, null, "me", [row(team("x", "Corrin"), 1)]);
    expect(plan.kind).toBe("ask");
    if (plan.kind !== "ask") return;
    expect(plan.prompt).toEqual({ localNames: ["Ashby"], accountNames: ["Corrin"] });
    expect(plan.merged.map((t) => t.id)).toEqual(["x", "a"]);
    expect(plan.accountOnly.map((t) => t.id)).toEqual(["x"]);
  });

  it("never mixes another account's clubs in, even into an empty account", () => {
    const plan = planLink([team("theirs")], true, "someone-else", "me", []);
    expect(plan).toEqual({ kind: "replace", teams: [], fromOther: true, parked: [] });
    const withOwn = planLink([team("theirs")], true, "someone-else", "me", [row(team("mine"), 3)]);
    expect(withOwn).toMatchObject({ kind: "replace", teams: [{ id: "mine" }] });
  });

  it("offers clubs made here while signed out to the next account, never the last one's saved clubs", () => {
    const saved = team("a-saved");
    const madeSignedOut = team("new", "Signed Out FC");
    const previous = { "a-saved": { rev: 2, hash: hashOf(saved) } };
    const plan = planLink([saved, madeSignedOut], true, "a", "b", [], previous, hashOf);
    expect(plan.kind).toBe("ask");
    if (plan.kind !== "ask") return;
    expect(plan.localOnly.map((t) => t.id)).toEqual(["new"]);
    expect(plan.merged.map((t) => t.id)).toEqual(["new"]);
    expect(plan.parked).toEqual([]);
  });

  it("puts the last account's unsaved edits aside for it instead of dropping them", () => {
    const edited = team("a-club", "Edited while signed out");
    const previous = { "a-club": { rev: 2, hash: "saved-version" } };
    const plan = planLink([edited], true, "a", "b", [row(team("mine"), 1)], previous, hashOf);
    expect(plan).toMatchObject({ kind: "replace", teams: [{ id: "mine" }], fromOther: true });
    expect(plan.parked.map((t) => t.name)).toEqual(["Edited while signed out"]);
  });

  it("treats everything as the last account's when its record is missing", () => {
    const plan = planLink([team("x")], true, "a", "b", [], null, hashOf);
    expect(plan).toMatchObject({ kind: "replace", teams: [], parked: [] });
  });

  it("doesn't ask about clubs that are already in the account, and skips deleted ones", () => {
    expect(planLink([team("x")], true, "me", "me", [row(team("x"), 1)]).kind).toBe("use");
    expect(planLink([], true, null, "me", [row(team("gone"), 2, true)])).toMatchObject({
      kind: "use",
      teams: [],
    });
  });
});

describe("applyRemote", () => {
  it("takes a newer revision when nothing changed here", () => {
    const local = [team("a", "Old")];
    const meta = metaWith({ a: { rev: 1, hash: hashOf(local[0]) } });
    const r = applyRemote(local, meta, [row(team("a", "New"), 4)], hashOf);
    expect(r.teams[0].name).toBe("New");
    expect(meta.known.a.rev).toBe(4);
  });

  it("keeps an unsaved edit here and notes the newer revision to save on top of", () => {
    const local = [team("a", "Edited here")];
    const meta = metaWith({ a: { rev: 1, hash: "before-the-edit" } });
    const r = applyRemote(local, meta, [row(team("a", "Remote"), 4)], hashOf);
    expect(r.teams[0].name).toBe("Edited here");
    expect(r.keptLocal).toBe(true);
    expect(meta.known.a).toEqual({ rev: 4, hash: "before-the-edit" });
  });

  it("an edit here wins over a deletion elsewhere", () => {
    const local = [team("a", "Edited"), team("b")];
    const meta = metaWith({ a: { rev: 1, hash: "old" }, b: { rev: 1, hash: hashOf(local[1]) } });
    const r = applyRemote(local, meta, [row(team("a"), 5, true)], hashOf);
    expect(r.teams.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("removes a club deleted elsewhere, and keeps the last one without re-saving it", () => {
    const local = [team("a"), team("b")];
    const meta = metaWith({
      a: { rev: 1, hash: hashOf(local[0]) },
      b: { rev: 1, hash: hashOf(local[1]) },
    });
    const r = applyRemote(local, meta, [row(team("a"), 5, true)], hashOf);
    expect(r.teams.map((t) => t.id)).toEqual(["b"]);
    const last = applyRemote(r.teams, meta, [row(team("b"), 6, true)], hashOf);
    expect(last.teams.map((t) => t.id)).toEqual(["b"]);
    // Its hash matches, so it isn't pushed back (it would come back on every device).
    expect(meta.known.b.hash).toBe(hashOf(last.teams[0]));
  });

  it("adds clubs created elsewhere and skips revisions already seen", () => {
    const meta = metaWith({ a: { rev: 9, hash: hashOf(team("a")) } });
    const r = applyRemote(
      [team("a")],
      meta,
      [row(team("a", "Same"), 9), row(team("z"), 10)],
      hashOf,
    );
    expect(r.teams.map((t) => t.name)).toEqual(["a", "z"]);
  });
});
