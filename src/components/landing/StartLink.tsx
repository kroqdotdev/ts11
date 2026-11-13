"use client";

import { START_EVENT } from "@/lib/events";
import { useHydrated, useStudio } from "@/lib/store";

/** The club's name for a button: the full name if it is short, else the short name. */
export function buttonName(team: { name: string; shortName: string }): string {
  const name = team.name.trim();
  return name.length <= 20 || !team.shortName.trim() ? name : team.shortName.trim();
}

/**
 * A call to action below the fold: hands over to the stadium hero, which scrolls
 * up and starts. A returning club is offered its own studio instead.
 */
export function StartLink({ children, className = "" }: { children: string; className?: string }) {
  const hydrated = useHydrated();
  const name = useStudio((s) => {
    const team = s.onboarded ? s.teams.find((t) => t.id === s.activeTeamId) : undefined;
    return team ? buttonName(team) : null;
  });
  return (
    <a
      href="/studio"
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new Event(START_EVENT));
      }}
      className={className}
    >
      <span className="truncate">{hydrated && name ? `Open ${name}` : children}</span>
    </a>
  );
}
