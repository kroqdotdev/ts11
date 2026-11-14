"use client";

import { useStudio } from "@/lib/store";
import type { Design, Team } from "@/lib/types";

/**
 * A place in the studio an image can sit. The names are as typed (possibly empty);
 * the page puts them into words in its own language.
 */
export type ImagePlace =
  | { kind: "crest"; club: string }
  | { kind: "opponentCrest"; club: string; opponent: string }
  | { kind: "background" }
  | { kind: "feature" }
  | { kind: "sponsor" };

/** Every place in the studio an image link can sit. */
function slots(teams: Team[], design: Design) {
  const out: { url: string | null; place: ImagePlace }[] = [];
  for (const t of teams) {
    out.push({ url: t.crest, place: { kind: "crest", club: t.name } });
    out.push({
      url: t.match.opponentCrest,
      place: { kind: "opponentCrest", club: t.name, opponent: t.match.opponent },
    });
  }
  out.push({ url: design.background.image, place: { kind: "background" } });
  out.push({ url: design.featureImage, place: { kind: "feature" } });
  out.push({ url: design.sponsorImage, place: { kind: "sponsor" } });
  return out;
}

/** Where an uploaded image is used, by its URL, e.g. [{ kind: "crest", club: "Ashby Vale" }]. */
export function imageUsage(url: string): ImagePlace[] {
  const s = useStudio.getState();
  return slots(s.teams, s.design)
    .filter((x) => x.url === url)
    .map((x) => x.place);
}

/** Clears an image from every club and the design, after it was deleted. */
export function forgetImage(url: string) {
  const s = useStudio.getState();
  const clear = (v: string | null) => (v === url ? null : v);
  const teams = s.teams.map((t) =>
    t.crest === url || t.match.opponentCrest === url
      ? {
          ...t,
          crest: clear(t.crest),
          crestKind: t.crest === url ? undefined : t.crestKind,
          match: { ...t.match, opponentCrest: clear(t.match.opponentCrest) },
        }
      : t,
  );
  const d = s.design;
  const design: Design = {
    ...d,
    background: { ...d.background, image: clear(d.background.image) },
    featureImage: clear(d.featureImage),
    sponsorImage: clear(d.sponsorImage),
  };
  useStudio.setState({ teams, design });
}
