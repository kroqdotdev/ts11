export type Position = "GK" | "DF" | "MF" | "FW";

export interface Player {
  id: string;
  name: string;
  /** Optional name printed on graphics instead of the formatted full name. */
  shirtName?: string;
  number: string;
  position: Position;
}

export interface Colors {
  primary: string;
  secondary: string;
}

export type TeamSize = 11 | 9 | 8 | 7 | 5;

export interface Lineup {
  size: TeamSize;
  formation: string;
  /** Player ids per formation slot; slot 0 is the goalkeeper. */
  starters: (string | null)[];
  bench: string[];
  captainId: string | null;
  /** Manual nudges from the pitch view, in percent of pitch width / height. */
  overrides: Record<number, { x: number; y: number }>;
}

export interface Goal {
  id: string;
  side: "us" | "them";
  name: string;
  /** The squad player who scored, when the name matched one. Wins over `name`. */
  playerId?: string | null;
  minute: string;
}

export interface Substitution {
  id: string;
  offId: string | null;
  onId: string | null;
  minute: string;
}

/** A row on the fixtures / results list graphic. */
export interface Fixture {
  id: string;
  opponent: string;
  isHome: boolean;
  date: string;
  kickoff: string;
  competition: string;
  /** Filled in once played, e.g. "3-1". Empty for upcoming fixtures. */
  score: string;
}

export interface Match {
  opponent: string;
  opponentShort: string;
  opponentCrest: string | null;
  opponentColors: Colors;
  isHome: boolean;
  competition: string;
  date: string;
  kickoff: string;
  venue: string;
  /**
   * true: the score is counted from the goals list (full and half time).
   * false: the score boxes below are used as typed.
   */
  autoScore: boolean;
  ourScore: number;
  theirScore: number;
  goals: Goal[];
  htOurScore: number;
  htTheirScore: number;
  /** Which goal the goal graphic celebrates; null means our most recent. */
  spotlightGoalId: string | null;
  subs: Substitution[];
  motmId: string | null;
  /** A short line under the player of the match, e.g. "Two goals and an assist". */
  motmNote: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  crest: string | null;
  /**
   * What the uploaded crest looks like, worked out on upload: "opaque" when it sits on
   * a solid (usually white) background, "transparent" when cut out. Graphics put an
   * opaque crest on a plate; a transparent one is drawn as is. Missing on old saves.
   */
  crestKind?: "opaque" | "transparent";
  colors: Colors;
  players: Player[];
  lineup: Lineup;
  match: Match;
  fixtures: Fixture[];
}

export type GraphicKind =
  "fixture" | "lineup" | "pitch" | "goal" | "halftime" | "subs" | "result" | "motm" | "fixtures";
export type FormatId = "square" | "portrait" | "story" | "wide";
export type LookId =
  "block" | "stripes" | "hoops" | "halves" | "sash" | "night" | "clean" | "pixel" | "stadium";
export type FontId =
  "archivo" | "anton" | "bebas" | "shoulders" | "oswald" | "teko" | "barlow" | "jersey";
export type NameStyle = "full" | "surname" | "initial";
export type TokenStyle = "shirt" | "disc";
export type PhotoOverlay = "fade" | "tint" | "duotone" | "none";

export interface BackgroundPhoto {
  image: string | null;
  /** Focal point in percent, used as object-position. */
  x: number;
  y: number;
  /** 1 = cover, up to 2.5 = zoomed in on the focal point. */
  zoom: number;
  overlay: PhotoOverlay;
  /** Overlay strength 0..1. */
  strength: number;
  mono: boolean;
}

export interface Design {
  kind: GraphicKind;
  format: FormatId;
  look: LookId;
  font: FontId;
  /** null means "use the club colours". */
  colors: Colors | null;
  headlines: Record<GraphicKind, string>;
  footer: string;
  nameStyle: NameStyle;
  tokenStyle: TokenStyle;
  showNumbers: boolean;
  showSubs: boolean;
  showCaptain: boolean;
  showLettering: boolean;
  background: BackgroundPhoto;
  /** Which graphics use the background photo; null means all of them. */
  backgroundOn: GraphicKind[] | null;
  featureImage: string | null;
  /** Which graphics show the player cut-out; null means all of them. */
  featureOn: GraphicKind[] | null;
  sponsorImage: string | null;
}

export interface GraphicData {
  team: Team;
  design: Design;
}
