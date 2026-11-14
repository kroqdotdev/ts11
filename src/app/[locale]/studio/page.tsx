import type { Metadata } from "next";
import { StudioLoader } from "@/components/studio/StudioLoader";
import { pageLocale, pageMetadata } from "@/i18n/page";

export function generateMetadata({ params }: PageProps<"/[locale]/studio">): Promise<Metadata> {
  return pageMetadata(params, "studio", "/studio");
}

export default async function StudioPage({ params }: PageProps<"/[locale]/studio">) {
  await pageLocale(params);
  return <StudioLoader />;
}
