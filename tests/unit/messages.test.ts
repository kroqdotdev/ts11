import { describe, expect, it } from "vitest";
import { messages } from "../../messages";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
  }
  return out;
}

/** The {placeholders} a message uses, ignoring the words inside plural branches. */
function args(message: string): string[] {
  const found = new Set<string>();
  for (const m of message.matchAll(/\{\s*([A-Za-z_][\w]*)\s*(?:,|\})/g)) found.add(m[1]);
  return [...found].sort();
}

/** Rich-text tags such as <link>…</link>. */
function tags(message: string): string[] {
  return [...new Set([...message.matchAll(/<\/?([A-Za-z][\w]*)>/g)].map((m) => m[1]))].sort();
}

describe("messages", () => {
  const en = flatten(messages.en as unknown as Tree);
  const da = flatten(messages.da as unknown as Tree);

  it("Danish has every English key and nothing else", () => {
    expect([...da.keys()].filter((k) => !en.has(k))).toEqual([]);
    expect([...en.keys()].filter((k) => !da.has(k))).toEqual([]);
  });

  it("both languages use the same placeholders and tags", () => {
    const wrong: string[] = [];
    for (const [key, text] of en) {
      const other = da.get(key);
      if (other === undefined) continue;
      if (args(text).join() !== args(other).join() || tags(text).join() !== tags(other).join())
        wrong.push(key);
    }
    expect(wrong).toEqual([]);
  });

  it("no message is empty", () => {
    const empty = [...en, ...da].filter(([, v]) => !v.trim()).map(([k]) => k);
    expect(empty).toEqual([]);
  });
});
