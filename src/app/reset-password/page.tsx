import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPassword } from "@/components/account/ResetPassword";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

async function Form({
  searchParams,
}: {
  searchParams: PageProps<"/reset-password">["searchParams"];
}) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  return <ResetPassword token={one(q.token)} linkError={one(q.error)} />;
}

export default function Page({ searchParams }: PageProps<"/reset-password">) {
  return (
    <main className="flex min-h-dvh flex-col pixel-turf bg-grass-deep">
      <header className="flex h-16 shrink-0 items-center px-4 lg:px-8">
        <span className="rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-chalk">
          <Wordmark className="text-[24px]" />
        </span>
      </header>
      <div className="grid flex-1 place-items-center px-4 pt-4 pb-16">
        <Window title="reset_password.exe" className="w-full max-w-md" bodyClassName="p-5 sm:p-6">
          <Suspense fallback={<div className="h-56" aria-busy="true" />}>
            <Form searchParams={searchParams} />
          </Suspense>
        </Window>
      </div>
    </main>
  );
}
