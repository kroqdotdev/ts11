import { notFound } from "next/navigation";
import { GraphicCheck } from "@/components/dev/GraphicCheck";

/** Dev-only gallery that `pnpm check:graphics` measures. Not part of the production site. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <GraphicCheck />;
}
