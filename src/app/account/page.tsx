import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { AccountPage } from "@/components/account/AccountPage";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Storage and account",
  description: "Your saved clubs, uploaded images and account settings.",
  robots: { index: false },
};

/** Checks the session on the server, so the right panel is in the first HTML. */
async function WithSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return <AccountPage signedIn={!!session?.user} />;
}

export default function Page() {
  return (
    <Suspense fallback={<AccountPage />}>
      <WithSession />
    </Suspense>
  );
}
