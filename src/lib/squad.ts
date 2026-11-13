import { FORMATIONS, formationSlots } from "./formation";
import type { Lineup, Player, Position, TeamSize } from "./types";

export interface ParsedPlayer extends Omit<Player, "id"> {
  /** Marked "(c)" or "capt" in the paste. */
  captain: boolean;
  /** The position was written in the paste, rather than defaulted. */
  positioned: boolean;
  /** Listed under a "Starting XI" or "Subs" heading, if the paste had one. */
  section: Section | null;
}

export type Section = "starters" | "bench";

/** A pasted line that was not read as a player, shown so it can be put back. */
export interface IgnoredLine {
  /** Line number in the pasted text, starting at 0. */
  line: number;
  /** The line as pasted; pass it back to `readSquad` in `restore` to read it as a player. */
  key: string;
  text: string;
  reason: string;
  /** False when there is nothing name-like to put back (an emoji, a heading). */
  restorable: boolean;
}

export interface SquadRead {
  players: ParsedPlayer[];
  ignored: IgnoredLine[];
}

/** Every way a position tends to be written in a group chat. Longest first within a role. */
const POSITION_WORDS: [Position, string[]][] = [
  ["GK", ["goalkeeper", "goalie", "keeper", "gk", "g/k"]],
  [
    "DF",
    ["defender", "defence", "defense", "def", "df", "cb", "lb", "rb", "lwb", "rwb", "fb", "wb"],
  ],
  ["MF", ["midfielder", "midfield", "mid", "mf", "cm", "cdm", "cam", "dm", "am", "lm", "rm"]],
  [
    "FW",
    ["forward", "striker", "winger", "attacker", "att", "fw", "fwd", "st", "cf", "lw", "rw", "ss"],
  ],
];
const POSITION_OF = new Map<string, Position>(
  POSITION_WORDS.flatMap(([pos, words]) => words.map((w) => [w, pos] as const)),
);
const POSITION_RE_G = new RegExp(
  `(?:^|[\\s(\\[,/-])(${[...POSITION_OF.keys()]
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace("/", "\\/"))
    .join("|")})(?=$|[\\s)\\],/.:-])`,
  "gi",
);

/**
 * Finds a position in the line. Short codes like "CAM" or "ST" are also first names
 * and abbreviations ("Cam Smith", "St. John"), so they only count in capitals, in
 * brackets or at the end of the line. Whole words like "keeper" count anywhere.
 */
function findPosition(line: string): { index: number; length: number; position: Position } | null {
  for (const m of line.matchAll(POSITION_RE_G)) {
    const word = m[1];
    const start = m.index + m[0].length - word.length;
    const after = line.slice(start + word.length);
    const bracketed = /^\s*[)\]]/.test(after) && /[([]\s*$/.test(line.slice(0, start));
    const atEnd = /^[\s.)\]]*$/.test(after);
    const capitals = word === word.toUpperCase();
    if (word.length > 3 || bracketed || atEnd || capitals) {
      return {
        index: m.index,
        length: m[0].length,
        position: POSITION_OF.get(word.toLowerCase())!,
      };
    }
  }
  return null;
}
const CAPTAIN_RE = /[([]\s*(?:c|capt|captain)\s*[)\]]|(?:^|\s)(?:capt|captain)\.?(?=\s|$)/i;
const VICE_RE = /[([]\s*(?:vc|vice)\s*[)\]]/gi;
// Emoji and other pictographs that come with chat pastes.
const EMOJI_RE = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu;

function cleanName(raw: string): string {
  return (
    raw
      // Empty brackets left behind once a number or position came out.
      .replace(/[([]\s*[)\]]/g, " ")
      .replace(/[[\]()#*_•·|]/g, " ")
      // Bullets, dashes and dots at the edges ("- Liam", "1. Danny", "Smith -").
      .replace(/^[\s.,:;\-–—)>]+/, "")
      .replace(/[\s.,:;\-–—(<]+$/, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Parses one pasted line, or null when nothing name-like is left. */
export function parseLine(line: string): ParsedPlayer | null {
  const p = readLine(line);
  return p && { ...p, section: null };
}

type LineRead = Omit<ParsedPlayer, "section"> & { words: string[] };

function readLine(line: string): LineRead | null {
  let rest = ` ${line.replace(EMOJI_RE, " ").replace(/\t/g, " ")} `;

  const captain = CAPTAIN_RE.test(rest);
  if (captain) rest = rest.replace(CAPTAIN_RE, " ");
  rest = rest.replace(VICE_RE, " ");

  let position: Position = "MF";
  let positioned = false;
  const pos = findPosition(rest);
  if (pos) {
    position = pos.position;
    positioned = true;
    rest = rest.slice(0, pos.index) + " " + rest.slice(pos.index + pos.length);
  }

  // A shirt number: at the start ("7.", "7)", "#7", "7 -"), at the end, or in brackets.
  let number = "";
  const lead = /^\s*#?\s*(\d{1,3})(?:\s*[.):\-–—]+\s*|\s+)/.exec(rest);
  const bracket = /[([]\s*#?(\d{1,3})\s*[)\]]/.exec(rest);
  const trail = /(?:\s|,|#)#?(\d{1,3})\s*[.,]?\s*$/.exec(rest);
  const found = lead ?? bracket ?? trail;
  if (found) {
    number = String(Number(found[1]));
    rest = rest.slice(0, found.index) + " " + rest.slice(found.index + found[0].length);
  }

  // Leftover commas and semicolons separate fields. Two parts where the first is a
  // single word read as "Surname, First" ("Adeyemi, Rotimi" is Rotimi Adeyemi).
  const parts = rest.split(/[,;]+/).map(cleanName).filter(Boolean);
  const surnameFirst =
    parts.length === 2 &&
    /^[\p{L}][\p{L}'’-]*$/u.test(parts[0]) &&
    parts[1].split(" ").length <= 2 &&
    parts[1].split(" ").every((w) => /^[\p{L}][\p{L}'’.-]*$/u.test(w));
  const name = cleanName((surnameFirst ? [parts[1], parts[0]] : parts).join(" "));
  if (!/\p{L}/u.test(name)) return null;
  return { name, number, position, captain, positioned, words: name.split(" ") };
}

// WhatsApp exports: iOS "[12/11/2026, 19:42:13] Dave (Manager): …" and
// Android "12/11/2026, 19:42 - Dave: …". The timestamp and sender are dropped.
const CHAT_PREFIX_RE =
  /^\s*[‎‏]?\[?\d{1,4}[./-]\d{1,2}[./-]\d{1,4},?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*[ap]\.?\s?m\.?)?\]?\s*(?:[-–]\s*)?(?:[^:]{1,40}?:\s+)?/i;
const SYSTEM_RE =
  /<media omitted>|\b(?:image|video|audio|sticker|gif|document) omitted\b|this message was deleted|messages and calls are end-to-end encrypted|\bcreated group\b|\badded\b.*\bto the group\b|\bleft$/i;
const URL_RE = /https?:\/\/|www\.|\.(?:com|co\.uk|org|net)\b/i;
const BENCH_HEADING_RE =
  /^(?:subs|substitutes|bench|reserves|on the bench|sub(?:stitute)?s? bench)\s*(?::|-|–)?\s*/i;
const STARTERS_HEADING_RE =
  /^(?:starting\s*(?:xi|11|eleven|line-?up|team)?|line-?up|team(?:\s+sheet)?|first\s*(?:xi|11|team)|starters|xi)\b\s*(?::|-|–)?\s*/i;
/** Small words that turn up in chat but never in a name (when written in lowercase). */
const CHAT_WORDS = new Set(
  (
    "a about all am an and anyone are as at be been bring but can cheers come could did do " +
    "does don't for from get got going good guys have here hey hi how i i'm if in is it it's " +
    "kick know lads let let's meet morning need no not of off on or our please pls see so " +
    "thanks that the there this tomorrow tonight today to training up us was we we're well " +
    "what when where who will with yes you your"
  ).split(" "),
);

/** Why a line reads as chat rather than a player, or null if it could be a player. */
function chatReason(text: string, read: LineRead): string | null {
  if (/[?!]\s*$/.test(text) && read.words.length > 1) return "Reads like a message";
  if (/\b\d{1,2}[:.]\d{2}\b|\b\d{1,2}\s?(?:am|pm)\b/i.test(text)) return "Has a time in it";
  if (read.words.length > 5) return "Too long for a name";
  // Lowercase small words: one is enough in a longer line, two in a short one
  // ("will smith" typed in lowercase is still a name; "see you" is not).
  const lower = read.words.filter((w) => CHAT_WORDS.has(w.toLowerCase()) && w === w.toLowerCase());
  if (lower.length >= (read.words.length >= 3 ? 1 : 2)) return "Reads like a message";
  // A lowercase first word followed by more words ("see you all") is a sentence.
  if (read.words.length > 2 && read.words.every((w) => w === w.toLowerCase())) {
    return "Reads like a message";
  }
  return null;
}

/**
 * Reads a pasted squad in almost any format: one player per line, numbers and positions
 * anywhere, WhatsApp timestamps and chat chatter dropped, and "Subs" or "Starting XI"
 * headings splitting starters from the bench. Lines in `restore` are read as players
 * whatever they look like.
 */
export function readSquad(text: string, restore: ReadonlySet<string> = new Set()): SquadRead {
  const players: ParsedPlayer[] = [];
  const ignored: IgnoredLine[] = [];
  let section: Section | null = null;

  let key = "";
  const add = (raw: string, line: number, force: boolean) => {
    const read = readLine(raw);
    if (!read) {
      if (raw.trim())
        ignored.push({ line, key, text: raw.trim(), reason: "No name in it", restorable: false });
      return;
    }
    const why = force ? null : chatReason(raw, read);
    if (why) {
      ignored.push({ line, key, text: raw.trim(), reason: why, restorable: true });
      return;
    }
    const { words: _words, ...player } = read;
    players.push({ ...player, section });
  };

  text.split(/\r?\n/).forEach((original, line) => {
    key = original.trim();
    const raw = original.replace(CHAT_PREFIX_RE, "").replace(/[‎‏]/g, "");
    const plain = raw.replace(EMOJI_RE, " ").replace(/\s+/g, " ").trim();
    if (!plain) {
      if (original.trim())
        ignored.push({
          line,
          key,
          text: raw.trim() || original.trim(),
          reason: "No name in it",
          restorable: false,
        });
      return;
    }
    if (restore.has(key)) return add(raw, line, true);
    if (SYSTEM_RE.test(plain) || URL_RE.test(plain)) {
      ignored.push({ line, key, text: raw.trim(), reason: "Not a player", restorable: true });
      return;
    }

    // "Subs:" and "Starting XI" headings switch the section. Names after them on the
    // same line ("Subs: Talbot, Brennan") are a list.
    const bench = BENCH_HEADING_RE.exec(plain);
    const starters = bench ? null : STARTERS_HEADING_RE.exec(plain);
    const heading = bench ?? starters;
    if (heading) {
      const rest = plain.slice(heading[0].length).trim();
      const listed = /[,;/]/.test(rest);
      // "Team for Saturday" and "Team news" are headings; "Team Smith" would not be.
      const isHeading = !!bench || !rest || listed || /^(?:for|v|vs|against)\b|^\p{Ll}/u.test(rest);
      if (isHeading) {
        section = bench ? "bench" : "starters";
        ignored.push({
          line,
          key,
          text: raw.trim(),
          reason: bench ? "Heading: the bench follows" : "Heading: the starters follow",
          restorable: !listed && !!rest,
        });
        if (rest && (listed || bench)) {
          for (const name of rest.split(/\s*[,;/]\s*/)) if (name.trim()) add(name, line, true);
        }
        return;
      }
    }
    add(raw, line, false);
  });

  // Only one captain: the first one marked.
  let seen = false;
  return {
    ignored,
    players: players.map((p) => {
      if (!p.captain) return p;
      if (seen) return { ...p, captain: false };
      seen = true;
      return p;
    }),
  };
}

/** The players in a pasted squad; see `readSquad`. */
export function parseSquad(text: string, restore?: ReadonlySet<string>): ParsedPlayer[] {
  return readSquad(text, restore).players;
}

export interface SquadWarning {
  /** Index in the parsed list. */
  index: number;
  message: string;
}

/** Same name or same number twice: shown beside the preview, not blocked. */
export function squadWarnings(players: Pick<Player, "name" | "number">[]): SquadWarning[] {
  const warnings: SquadWarning[] = [];
  const names = new Map<string, number>();
  const numbers = new Map<string, number>();
  players.forEach((p, i) => {
    const key = p.name.trim().toLowerCase();
    const firstName = names.get(key);
    if (key && firstName !== undefined)
      warnings.push({ index: i, message: `Same name as no. ${firstName + 1} in the list` });
    else if (key) names.set(key, i);
    if (p.number) {
      const firstNum = numbers.get(p.number);
      if (firstNum !== undefined)
        warnings.push({ index: i, message: `Shirt ${p.number} is taken twice` });
      else numbers.set(p.number, i);
    }
  });
  return warnings;
}

/**
 * Fills the starting slots by position first (keepers in goal, defenders at the back
 * and so on), then any gaps in squad order. The rest go on the bench.
 */
export function autoLineup(
  players: (Player & { captain?: boolean; positioned?: boolean; section?: Section | null })[],
  size: TeamSize,
  captainId: string | null = null,
): Lineup {
  const formation = FORMATIONS[size][0];
  const slots = formationSlots(formation, size);
  const starters: (string | null)[] = slots.map(() => null);
  const used = new Set<string>();
  const take = (slot: number, p: Player) => {
    starters[slot] = p.id;
    used.add(p.id);
  };

  // Under a "Subs" heading means the bench, whatever the positions say.
  const pool = players.some((p) => p.section === "bench")
    ? players.filter((p) => p.section !== "bench")
    : players;

  // Pass 1: players whose position was given and matches the slot's role, in squad order.
  for (const slot of slots) {
    const p = pool.find(
      (q) => !used.has(q.id) && q.positioned !== false && q.position === slot.role,
    );
    if (p) take(slot.index, p);
  }
  // Pass 2: fill the gaps in squad order, but never put a second keeper outfield
  // while outfield players are still waiting.
  for (const slot of slots) {
    if (starters[slot.index]) continue;
    const p =
      pool.find((q) => !used.has(q.id) && (slot.role === "GK") === (q.position === "GK")) ??
      pool.find((q) => !used.has(q.id));
    if (p) take(slot.index, p);
  }

  // Listed subs first, then anyone left over from the starters.
  const left = players.filter((p) => !used.has(p.id));
  const bench = [
    ...left.filter((p) => p.section === "bench"),
    ...left.filter((p) => p.section !== "bench"),
  ].slice(0, 9);
  const marked = players.find((p) => p.captain)?.id ?? null;
  return {
    size,
    formation,
    starters,
    bench: bench.map((p) => p.id),
    captainId: captainId ?? marked,
    overrides: {},
  };
}
