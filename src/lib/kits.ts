import type { LookId } from "./types";

export interface Kit {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  /** The kit pattern that suits these colours best. */
  look: LookId;
}

/** Classic colour pairs found up and down the leagues, ready to pick. */
export const KITS: Kit[] = [
  {
    id: "red-white",
    name: "Red and white",
    primary: "#c8102e",
    secondary: "#f4f4f1",
    look: "stripes",
  },
  {
    id: "royal",
    name: "Royal blue and white",
    primary: "#1b45a8",
    secondary: "#f4f4f1",
    look: "block",
  },
  {
    id: "black-white",
    name: "Black and white",
    primary: "#161616",
    secondary: "#f2f2ef",
    look: "stripes",
  },
  {
    id: "green-white",
    name: "Green and white",
    primary: "#0b7a3e",
    secondary: "#f4f4f1",
    look: "hoops",
  },
  {
    id: "claret-sky",
    name: "Claret and sky",
    primary: "#6c1d45",
    secondary: "#95bfe5",
    look: "block",
  },
  {
    id: "tangerine",
    name: "Tangerine and black",
    primary: "#f26a1b",
    secondary: "#161616",
    look: "halves",
  },
  {
    id: "navy-gold",
    name: "Navy and gold",
    primary: "#13274f",
    secondary: "#e9b62c",
    look: "sash",
  },
  {
    id: "sky-navy",
    name: "Sky blue and navy",
    primary: "#6cabdd",
    secondary: "#13274f",
    look: "night",
  },
  {
    id: "amber-black",
    name: "Amber and black",
    primary: "#f2b705",
    secondary: "#161616",
    look: "stripes",
  },
  {
    id: "maroon-white",
    name: "Maroon and white",
    primary: "#7b1e2b",
    secondary: "#f4f4f1",
    look: "clean",
  },
];
