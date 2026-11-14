import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitch } from "@/components/i18n/LocaleSwitch";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";
import { Link } from "@/i18n/navigation";
import { pageLocale, pageMetadata } from "@/i18n/page";
import { INTL_LOCALE } from "@/i18n/routing";
import { SOURCE_URL } from "@/lib/brand";
import { OPERATOR, PRIVACY_UPDATED } from "@/lib/legal";

export function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  return pageMetadata(params, "privacy", "/privacy");
}

const link = "font-medium text-ink underline underline-offset-2";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-signage text-[26px] leading-none text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** The privacy policy, in plain words. */
export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  const locale = await pageLocale(params);
  const t = await getTranslations("privacy");
  const email = OPERATOR.privacyEmail;
  const mail = (chunks: ReactNode) => (
    <a href={`mailto:${email}`} className={link}>
      {chunks}
    </a>
  );
  const date = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${PRIVACY_UPDATED}T12:00:00Z`));

  return (
    <div className="flex min-h-dvh flex-col pixel-turf">
      <header className="flex items-center justify-between gap-2 px-4 py-4 sm:gap-4 lg:px-8">
        <span className="rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-chalk">
          <Wordmark className="text-[22px]" />
        </span>
        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleSwitch tone="chalk" className="bg-[#10151c]/85" />
          <Link
            href="/studio"
            className="shrink-0 lofi-press rounded-[4px] border-2 border-card-ink bg-paper px-3 py-1.5 text-sm font-medium whitespace-nowrap text-ink shadow-[3px_3px_0_var(--card-ink)]"
          >
            {t("openStudio")}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 pt-4 pb-16 lg:pt-8">
        <Window
          title={t("file")}
          className="w-full max-w-[42rem] self-start"
          bodyClassName="flex flex-col gap-8 px-5 py-6 text-[15px] leading-relaxed text-ink-soft sm:px-8 sm:py-8"
        >
          <div className="flex flex-col gap-3">
            <h1 className="font-signage text-[40px] leading-none text-ink">{t("title")}</h1>
            <p>{t("updated", { date })}</p>
          </div>

          <Section title={t("without.title")}>
            <p>{t("without.local")}</p>
            <p>{t("without.tracking")}</p>
          </Section>

          <Section title={t("controller.title")}>
            <p>
              {t.rich("controller.body", {
                name: OPERATOR.name,
                cvr: OPERATOR.cvr,
                email,
                mail,
              })}
            </p>
          </Section>

          <Section title={t("account.title")}>
            <p>{t("account.intro")}</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              <li>{t("account.email")}</li>
              <li>{t("account.google")}</li>
              <li>{t("account.clubs")}</li>
              <li>{t("account.uploads")}</li>
              <li>{t("account.sessions")}</li>
            </ul>
            <p>{t("account.use")}</p>
            <p>
              {t.rich("account.basis", {
                nowrap: (chunks) => <span className="whitespace-nowrap">{chunks}</span>,
              })}
            </p>
          </Section>

          <Section title={t("where.title")}>
            <p>{t("where.servers")}</p>
            <p>{t("where.links")}</p>
          </Section>

          <Section title={t("cookies.title")}>
            <p>{t("cookies.body")}</p>
          </Section>

          <Section title={t("retention.title")}>
            <p>
              {t.rich("retention.body", {
                account: (chunks) => (
                  <Link href="/account" className={link}>
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </Section>

          <Section title={t("rights.title")}>
            <p>{t.rich("rights.body", { email, mail })}</p>
            <p>
              {t.rich("rights.complain", {
                authority: (chunks) => (
                  <a href="https://www.datatilsynet.dk" className={link}>
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </Section>

          <Section title={t("source.title")}>
            <p>
              {t.rich("source.body", {
                source: (chunks) => (
                  <a href={SOURCE_URL} className={link}>
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </Section>
        </Window>
      </main>
    </div>
  );
}
