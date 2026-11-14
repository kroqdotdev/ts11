"use client";

import { ArrowLeftIcon, CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button, Dialog, TextInput } from "@/components/ui/controls";
import { Check } from "./Check";
import {
  dbuErrorKey,
  getDbuClub,
  getDbuImport,
  searchDbuClubs,
  selectionKey,
  type DbuClub,
  type DbuClubHit,
  type DbuImport,
  type DbuLink,
} from "@/lib/dbu";

type Stage =
  { name: "search" } | { name: "loading-club"; hit: DbuClubHit } | { name: "teams"; club: DbuClub };

/**
 * Finds a Danish club on DBU, lets the person tick the competitions their team plays
 * in, and hands back the fixtures with crests and colours. What happens with them is
 * up to the caller (the club setup fills in a new club; the studio adds fixtures).
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  /** Opens on this club's teams with these ticked, to change what a team follows. */
  link?: DbuLink | null;
  onImport: (data: DbuImport, link: DbuLink, club: DbuClub) => void | Promise<void>;
}

export function DbuImportDialog(props: Props) {
  // A fresh start each time it opens: the body remounts with the props of that moment.
  const [opened, setOpened] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setOpened((n) => n + 1);
  }
  return <ImportBody key={opened} {...props} />;
}

function ImportBody({ open, onOpenChange, initialQuery = "", link, onImport }: Props) {
  const [stage, setStage] = useState<Stage>(
    link ? { name: "loading-club", hit: { id: link.clubId, name: "" } } : { name: "search" },
  );
  const [query, setQuery] = useState(initialQuery);
  const [hits, setHits] = useState<DbuClubHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(link?.teams.map(selectionKey) ?? []),
  );
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryId = useId();
  const resultsRef = useRef<HTMLUListElement>(null);
  const teamsRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("dbu");
  const message = (e: unknown) => t(`errors.${dbuErrorKey(e)}`);

  async function search() {
    const q = query.trim();
    if (q.length < 2) {
      setError(t("import.tooShort"));
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const found = await searchDbuClubs(q);
      setHits(found);
      if (found.length)
        requestAnimationFrame(() => resultsRef.current?.querySelector("button")?.focus());
    } catch (e) {
      setError(message(e));
    } finally {
      setSearching(false);
    }
  }

  function openClub(hit: DbuClubHit) {
    setStage({ name: "loading-club", hit });
    setError(null);
    setPicked(new Set());
    void loadClub(hit.id);
  }

  async function loadClub(id: string) {
    try {
      const club = await getDbuClub(id);
      setStage({ name: "teams", club });
      const listed = new Set(club.teams.map(selectionKey));
      // With one competition there's nothing to choose. Otherwise keep only the ticks
      // the club still has: a competition from last season may be gone.
      setPicked((prev) =>
        club.teams.length === 1 ? listed : new Set([...prev].filter((k) => listed.has(k))),
      );
      requestAnimationFrame(() => teamsRef.current?.querySelector("input")?.focus());
    } catch (e) {
      setStage({ name: "search" });
      setError(message(e));
    }
  }

  // Changing what a team follows starts on its club's teams.
  useEffect(() => {
    if (open && link) void loadClub(link.clubId);
    // Once per opening (the body remounts each time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runImport(club: DbuClub) {
    const teams = club.teams.filter((t) => picked.has(selectionKey(t)));
    if (!teams.length) return;
    const chosen: DbuLink = {
      clubId: club.id,
      teams: teams.map(({ teamId, poolId }) => ({ teamId, poolId })),
    };
    setImporting(true);
    setError(null);
    try {
      const data = await getDbuImport(chosen);
      await onImport(data, chosen, club);
      onOpenChange(false);
    } catch (e) {
      setError(message(e));
    } finally {
      setImporting(false);
    }
  }

  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const club = stage.name === "teams" ? stage.club : null;
  // Only ticks the club lists count, for the button and its label.
  const chosenCount = club ? club.teams.filter((e) => picked.has(selectionKey(e))).length : 0;
  const groups = club
    ? [...new Set(club.teams.map((t) => t.group))].map((group) => ({
        group,
        teams: club.teams.filter((t) => t.group === group),
      }))
    : [];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !importing && onOpenChange(o)}
      title={t("import.title")}
      description={club ? t("import.pickIntro") : t("import.intro")}
      footer={
        club ? (
          <>
            <Button onClick={() => onOpenChange(false)} disabled={importing}>
              {t("import.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() => runImport(club)}
              disabled={importing || chosenCount === 0}
            >
              {importing ? t("import.importing") : t("import.importButton", { count: chosenCount })}
            </Button>
          </>
        ) : undefined
      }
    >
      {stage.name !== "teams" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            // The dialog is portalled, but React still bubbles the submit to a form
            // around it (the club setup), which would move on a step.
            e.stopPropagation();
            void search();
          }}
        >
          <label htmlFor={queryId} className="text-[13px] font-semibold">
            {t("import.clubName")}
          </label>
          <div className="flex gap-2">
            <TextInput
              id={queryId}
              autoFocus
              value={query}
              placeholder={t("import.placeholder")}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            <Button type="submit" disabled={searching} aria-label={t("import.searchLabel")}>
              <MagnifyingGlassIcon size={16} weight="bold" />
              <span className="max-sm:hidden">
                {searching ? t("import.searching") : t("import.search")}
              </span>
            </Button>
          </div>
        </form>
      )}

      {stage.name === "search" && hits && (
        <div className="flex flex-col gap-2">
          {hits.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("import.noHits", { query: query.trim() })}</p>
          ) : (
            <ul
              ref={resultsRef}
              className="flex flex-col gap-1.5"
              aria-label={t("import.hitsLabel")}
            >
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => openClub(hit)}
                    className="flex w-full items-center justify-between gap-3 rounded-[3px] border-2 border-ink/20 bg-paper px-3 py-2.5 text-left text-sm font-semibold hover:border-ink focus-visible:border-ink focus-visible:shadow-[3px_3px_0_var(--card)] focus-visible:outline-none"
                  >
                    {hit.name}
                    <CaretRightIcon size={14} weight="bold" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {stage.name === "loading-club" && (
        <p className="text-sm text-ink-soft" role="status">
          {t("import.loadingClub")}
        </p>
      )}

      {club && (
        <div ref={teamsRef} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-signage text-[22px] leading-none">{club.name}</p>
            <Button
              size="sm"
              variant="ghost"
              disabled={importing}
              onClick={() => {
                setStage({ name: "search" });
                setPicked(new Set());
              }}
            >
              <ArrowLeftIcon size={14} />
              {t("import.otherClub")}
            </Button>
          </div>
          {club.teams.length === 0 ? (
            <p className="text-sm text-ink-soft">{t("import.noTeams")}</p>
          ) : (
            groups.map(({ group, teams }) => (
              <fieldset key={group || "teams"} className="flex flex-col gap-1.5">
                {group && (
                  <legend className="mb-1.5 text-[13px] font-semibold text-ink">{group}</legend>
                )}
                {teams.map((entry) => {
                  const key = selectionKey(entry);
                  return (
                    <Check
                      key={key}
                      checked={picked.has(key)}
                      onChange={() => toggle(key)}
                      disabled={importing}
                      title={entry.competition}
                      detail={entry.pool}
                    />
                  );
                })}
              </fieldset>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs leading-snug text-ink-soft">{t("import.source")}</p>
    </Dialog>
  );
}
