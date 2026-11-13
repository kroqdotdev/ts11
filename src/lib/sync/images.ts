"use client";

import { useStudio } from "@/lib/store";
import type { Design, Team } from "@/lib/types";

/** Every place in the studio an image link can sit, with a readable label. */
function slots(teams: Team[], design: Design) {
  const out: { url: string | null; label: string }[] = [];
  for (const t of teams) {
    out.push({ url: t.crest, label: `${t.name || "Unnamed club"} crest` });
    out.push({
      url: t.match.opponentCrest,
      label: `${t.match.opponent || "Opponent"} crest (${t.name || "club"})`,
    });
  }
  out.push({ url: design.background.image, label: "Background photo" });
  out.push({ url: design.featureImage, label: "Player cut-out" });
  out.push({ url: design.sponsorImage, label: "Sponsor logo" });
  return out;
}

/** Where an uploaded image is used, by its URL, e.g. ["Ashby Vale crest"]. */
export function imageUsage(url: string): string[] {
  const s = useStudio.getState();
  return slots(s.teams, s.design)
    .filter((x) => x.url === url)
    .map((x) => x.label);
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
