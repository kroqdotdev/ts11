import { ImageResponse } from "next/og";
import { CardMark, jerseyFont, OG } from "@/lib/og/brand";

/* The home-screen icon on iPhone and iPad (iOS rounds the corners itself). */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: OG.navy,
      }}
    >
      <CardMark height={112} tilt={-8} />
    </div>,
    { ...size, fonts: [jerseyFont] },
  );
}
