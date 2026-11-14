import type { LookId } from "./types";

export type KitId =
  | "red-white"
  | "royal"
  | "black-white"
  | "green-white"
  | "claret-sky"
  | "tangerine"
  | "navy-gold"
  | "sky-navy"
  | "amber-black"
  | "maroon-white";

export interface Kit {
  /** Also the key of its name in messages (`setup.kits.<id>`). */
  id: KitId;
  primary: string;
  secondary: string;
  /** The kit pattern that suits these colours best. */
  look: LookId;
}

/** Classic colour pairs found up and down the leagues, ready to pick. */
export const KITS: Kit[] = [
  {
    id: "red-white",
    primary: "#c8102e",
    secondary: "#f4f4f1",
    look: "stripes",
  },
  {
    id: "royal",
    primary: "#1b45a8",
    secondary: "#f4f4f1",
    look: "block",
  },
  {
    id: "black-white",
    primary: "#161616",
    secondary: "#f2f2ef",
    look: "stripes",
  },
  {
    id: "green-white",
    primary: "#0b7a3e",
    secondary: "#f4f4f1",
    look: "hoops",
  },
  {
    id: "claret-sky",
    primary: "#6c1d45",
    secondary: "#95bfe5",
    look: "block",
  },
  {
    id: "tangerine",
    primary: "#f26a1b",
    secondary: "#161616",
    look: "halves",
  },
  {
    id: "navy-gold",
    primary: "#13274f",
    secondary: "#e9b62c",
    look: "sash",
  },
  {
    id: "sky-navy",
    primary: "#6cabdd",
    secondary: "#13274f",
    look: "night",
  },
  {
    id: "amber-black",
    primary: "#f2b705",
    secondary: "#161616",
    look: "stripes",
  },
  {
    id: "maroon-white",
    primary: "#7b1e2b",
    secondary: "#f4f4f1",
    look: "clean",
  },
];
