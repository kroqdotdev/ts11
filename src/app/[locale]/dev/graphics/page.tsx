import { notFound } from "next/navigation";
import { GraphicCheck } from "@/components/dev/GraphicCheck";
import { pageLocale } from "@/i18n/page";

/** Dev-only gallery that `pnpm check:graphics` measures. Not part of the production site. */
export default async function Page({ params }: PageProps<"/[locale]/dev/graphics">) {
  await pageLocale(params);
  if (process.env.NODE_ENV === "production") notFound();
  return <GraphicCheck />;
}
