import { ArrowUUpLeftIcon, WarningIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import { squadWarnings, type IgnoredLine, type ParsedPlayer } from "@/lib/squad";

const POS = { GK: "GK", DF: "DEF", MF: "MID", FW: "ATT" } as const;

/**
 * What a pasted squad list was read as: number, name, captain and position per line,
 * with duplicate names and shirt numbers flagged so they get fixed before the graphics.
 */
export function SquadPreview({
  players,
  ignored = [],
  onRestore,
  size,
  className,
  rootClassName,
  columns = false,
}: {
  players: ParsedPlayer[];
  /** Lines that weren't read as players (chat, headings, links), each restorable. */
  ignored?: IgnoredLine[];
  /** Reads an ignored line as a player after all. */
  onRestore?: (key: string) => void;
  /** Players per side, for the summary line. Omit when adding to an existing squad. */
  size?: number;
  /** The list and the left-out lines; give it a height to make it scroll. */
  className?: string;
  rootClassName?: string;
  /** Long squads read in two columns, so a whole squad fits without scrolling. */
  columns?: boolean;
}) {
  const warnings = squadWarnings(players);
  const warn = new Map(warnings.map((w) => [w.index, w.message]));
  const guessed = players.filter((p) => !p.positioned).length;
  const benched = players.filter((p) => p.section === "bench").length;
  const left = ignored.filter((l) => !l.reason.startsWith("Heading"));

  return (
    <div className={clsx("flex min-w-0 flex-col gap-2", rootClassName)}>
      <p className="text-xs text-ink-soft" aria-live="polite">
        {players.length === 0
          ? "No players yet. You can add them later too."
          : [
              `${players.length} ${players.length === 1 ? "player" : "players"} found.`,
              size
                ? benched
                  ? `${benched} listed as subs start on the bench; the rest fill their positions.`
                  : "They fill the spots for their positions; the rest start on the bench."
                : "",
              guessed ? `${guessed} with no position fill the gaps in list order.` : "",
              left.length
                ? `${left.length} chat ${left.length === 1 ? "line" : "lines"} left out.`
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
      </p>
      {warnings.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-danger" role="status">
          <WarningIcon size={14} weight="fill" aria-hidden />
          {warnings.length === 1 ? "1 line needs a look" : `${warnings.length} lines need a look`}
        </p>
      )}
      {/* relative: keeps the sr-only labels inside this box when it scrolls. */}
      <div className={clsx("relative flex flex-col gap-2", className)}>
        {players.length > 0 && (
          <ol
            className={clsx(
              "text-[13px]",
              columns && players.length > 8
                ? "columns-2 gap-x-4 *:mb-1 *:break-inside-avoid"
                : "flex flex-col gap-y-1",
            )}
          >
            {players.slice(0, 40).map((p, i) => {
              const problem = warn.get(i);
              return (
                <li
                  key={i}
                  className={clsx(
                    "flex min-w-0 flex-wrap items-baseline gap-x-2 rounded-[2px] px-1",
                    problem && "bg-danger/10 outline outline-1 outline-danger/40",
                  )}
                >
                  <span className="w-6 shrink-0 text-right font-semibold text-card tabular-nums">
                    {p.number || "-"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {p.name}
                    {p.captain && (
                      <span
                        className="ml-1.5 inline-grid size-4 place-items-center rounded-full bg-card align-[1px] text-[10px] font-bold text-card-ink"
                        title="Captain"
                      >
                        C<span className="sr-only">aptain</span>
                      </span>
                    )}
                  </span>
                  <span
                    className={clsx(
                      "shrink-0 text-[11px]",
                      p.positioned ? "text-ink-soft" : "text-ink-soft/60 italic",
                    )}
                    title={p.positioned ? undefined : "No position given"}
                  >
                    {POS[p.position]}
                    {!p.positioned && "?"}
                  </span>
                  {problem && (
                    <span className="basis-full pl-8 text-[11px] font-medium text-danger">
                      {problem}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        {left.length > 0 && (
          <details className="group text-[12px]">
            <summary className="cursor-pointer font-medium text-ink-soft select-none hover:text-ink">
              Left out ({left.length})
            </summary>
            <ul className="mt-1.5 flex flex-col gap-1">
              {left.map((l) => (
                <li
                  key={`${l.line}-${l.key}`}
                  className="flex min-w-0 items-center gap-2 rounded-[2px] bg-ink/5 px-1.5 py-1"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink" title={l.text}>
                      {l.text}
                    </span>
                    <span className="block text-[11px] text-ink-soft">{l.reason}</span>
                  </span>
                  {onRestore && l.restorable && (
                    <button
                      type="button"
                      onClick={() => onRestore(l.key)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-[2px] border-2 border-card-ink bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-card-ink hover:bg-card"
                    >
                      <ArrowUUpLeftIcon size={12} weight="bold" aria-hidden />
                      It&rsquo;s a player
                      <span className="sr-only">: {l.text}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
