import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ResetPassword } from "@/components/account/ResetPassword";
import { LocaleSwitch } from "@/components/i18n/LocaleSwitch";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";
import { pageLocale, pageMetadata } from "@/i18n/page";

export function generateMetadata({
  params,
}: PageProps<"/[locale]/reset-password">): Promise<Metadata> {
  return pageMetadata(params, "resetPassword", "/reset-password", { robots: { index: false } });
}

type Search = Awaited<PageProps<"/[locale]/reset-password">["searchParams"]>;

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) || null;
}

/** Reads the link's token (or the error Better Auth sends back) on the server. */
async function FromLink({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  return <ResetPassword token={first(query.token)} linkError={first(query.error)} />;
}

export default async function Page({
  params,
  searchParams,
}: PageProps<"/[locale]/reset-password">) {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: "account.resetPage" });
  return (
    <div className="flex min-h-dvh flex-col pixel-turf">
      <header className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <span className="rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-chalk">
          <Wordmark className="text-[22px]" />
        </span>
        <LocaleSwitch tone="chalk" className="bg-[#10151c]/85" />
      </header>

      <main className="flex flex-1 justify-center px-4 pt-4 pb-16 lg:pt-8">
        <Window
          title={t("window")}
          className="w-full max-w-[28rem] self-start"
          bodyClassName="px-5 py-6 sm:px-8 sm:py-8"
        >
          <Suspense fallback={<div aria-busy className="min-h-[19rem]" />}>
            <FromLink searchParams={searchParams} />
          </Suspense>
        </Window>
      </main>
    </div>
  );
}
