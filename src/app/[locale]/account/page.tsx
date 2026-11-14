import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { AccountPage } from "@/components/account/AccountPage";
import { pageLocale, pageMetadata } from "@/i18n/page";
import { auth } from "@/server/auth";

export function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  return pageMetadata(params, "account", "/account", { robots: { index: false } });
}

/** Checks the session on the server, so the right panel is in the first HTML. */
async function WithSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return <AccountPage signedIn={!!session?.user} />;
}

export default async function Page({ params }: PageProps<"/[locale]/account">) {
  await pageLocale(params);
  return (
    <Suspense fallback={<AccountPage />}>
      <WithSession />
    </Suspense>
  );
}
