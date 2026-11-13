import type { Metadata } from "next";
import { StudioLoader } from "@/components/studio/StudioLoader";

export const metadata: Metadata = {
  title: "Studio",
  description: "Build your starting XI, team news, matchday and full-time graphics.",
};

export default function StudioPage() {
  return <StudioLoader />;
}
