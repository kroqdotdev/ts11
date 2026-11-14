import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPassword } from "@/components/account/ResetPassword";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your teamsheet11 account.",
  robots: { index: false },
};

type Search = Awaited<PageProps<"/reset-password">["searchParams"]>;

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) || null;
}

/** Reads the link's token (or the error Better Auth sends back) on the server. */
async function FromLink({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  return <ResetPassword token={first(query.token)} linkError={first(query.error)} />;
}

export default function Page({ searchParams }: PageProps<"/reset-password">) {
  return (
    <div className="flex min-h-dvh flex-col pixel-turf">
      <header className="flex items-center px-4 py-4 lg:px-8">
        <span className="rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-chalk">
          <Wordmark className="text-[22px]" />
        </span>
      </header>

      <main className="flex flex-1 justify-center px-4 pt-4 pb-16 lg:pt-8">
        <Window
          title="reset_password.exe"
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
