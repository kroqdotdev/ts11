import type { GraphicKind } from "./types";

/**
 * Every graphic, in the order they happen around a match. Names and hints are
 * interface text: `studio.kinds.<id>` in messages/.
 */
export const KINDS: { id: GraphicKind; when: "before" | "during" | "after" | "any" }[] = [
  { id: "fixture", when: "before" },
  { id: "lineup", when: "before" },
  { id: "pitch", when: "before" },
  { id: "goal", when: "during" },
  { id: "halftime", when: "during" },
  { id: "subs", when: "during" },
  { id: "result", when: "after" },
  { id: "motm", when: "after" },
  { id: "fixtures", when: "any" },
];
