import type { GraphicKind } from "./types";

/** Every graphic, in the order they happen around a match. */
export const KINDS: { id: GraphicKind; label: string; when: string; hint: string }[] = [
  { id: "fixture", label: "Matchday", when: "Before", hint: "Opponent, kick-off and venue" },
  { id: "lineup", label: "Starting XI", when: "Before", hint: "Numbers, names and the bench" },
  { id: "pitch", label: "Team news", when: "Before", hint: "Your shape on a pitch" },
  { id: "goal", label: "Goal", when: "During", hint: "The scorer, the minute, the score" },
  { id: "halftime", label: "Half time", when: "During", hint: "The score at the break" },
  { id: "subs", label: "Substitutions", when: "During", hint: "Who came on and off" },
  { id: "result", label: "Full time", when: "After", hint: "Final score and scorers" },
  { id: "motm", label: "Player of the match", when: "After", hint: "Your standout player" },
  { id: "fixtures", label: "Fixtures", when: "Any time", hint: "The next few games, or results" },
];

export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<
  GraphicKind,
  string
>;
