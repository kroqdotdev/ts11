import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Colours from the low-fi theme (`src/app/globals.css`); the share images can't read CSS. */
export const OG = {
  grass: "#1c5434",
  mown: "#21603b",
  deep: "#113520",
  chalk: "#f2f5ef",
  card: "#f7c600",
  cardInk: "#0d1a12",
  navy: "#13213a",
} as const;

/*
 * Jersey 10, the pixel shirt lettering the site uses for headings (SIL OFL, see src/fonts/).
 * Read once when the module loads: reading it per request is uncached IO, which Cache
 * Components refuses in a prerendered route.
 */
const jerseyData = await readFile(join(process.cwd(), "src/fonts/Jersey10-Regular.ttf"));

export const jerseyFont = {
  name: "Jersey",
  data: jerseyData,
  style: "normal",
  weight: 400,
} as const;

/** The mark: a referee's card printed with the 11, tilted like the one in the header. */
export function CardMark({ height, tilt = 8 }: { height: number; tilt?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: height * 0.72,
        height,
        borderRadius: height * 0.08,
        background: OG.card,
        color: OG.cardInk,
        fontFamily: "Jersey",
        fontSize: height * 0.62,
        lineHeight: 1,
        transform: `rotate(${tilt}deg)`,
        boxShadow: `${height * 0.04}px ${height * 0.06}px 0 rgba(6, 24, 13, 0.45)`,
      }}
    >
      11
    </div>
  );
}
