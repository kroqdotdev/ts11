"use client";

import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { flushStorage } from "@/lib/store";

/** Each language is named in itself, so it reads right to whoever needs it. */
const NAMES: Record<Locale, string> = { en: "English", da: "Dansk" };

/**
 * Switches the interface between English and Danish, staying on the same page.
 * Shows the language you'd switch to. `tone` matches the surface it sits on.
 */
export function LocaleSwitch({
  tone = "paper",
  className,
}: {
  tone?: "paper" | "chalk";
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("common.language");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <button
      type="button"
      lang={other}
      aria-label={t("switch")}
      disabled={pending}
      onClick={() => {
        flushStorage();
        const query = Object.fromEntries(new URLSearchParams(window.location.search));
        start(() => router.replace({ pathname, query }, { locale: other, scroll: false }));
      }}
      className={clsx(
        "shrink-0 rounded-[4px] px-2 py-1.5 text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline disabled:opacity-60 sm:px-3",
        tone === "chalk" ? "text-chalk" : "text-ink",
        className,
      )}
    >
      {NAMES[other]}
    </button>
  );
}
