import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/brand";

/*
 * One manifest for both languages (a manifest can't follow the reader's language), so the
 * description is English. Installing from /da still opens the Danish studio: the language
 * cookie sends the reader there.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Free match day graphics for grassroots football clubs.",
    start_url: "/studio",
    scope: "/",
    display: "browser",
    background_color: "#0f151c",
    theme_color: "#0f151c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
