import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";
import { SOURCE_URL } from "@/lib/brand";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What teamsheet11 keeps, where it is kept and for how long, with or without an account.",
};

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
export default function Page() {
  const mail = `mailto:${OPERATOR.privacyEmail}`;
  return (
    <div className="flex min-h-dvh flex-col pixel-turf">
      <header className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <span className="rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-chalk">
          <Wordmark className="text-[22px]" />
        </span>
        <Link
          href="/studio"
          className="shrink-0 lofi-press rounded-[4px] border-2 border-card-ink bg-paper px-3 py-1.5 text-sm font-medium text-ink shadow-[3px_3px_0_var(--card-ink)]"
        >
          Open the studio
        </Link>
      </header>

      <main className="flex flex-1 justify-center px-4 pt-4 pb-16 lg:pt-8">
        <Window
          title="privacy.txt"
          className="w-full max-w-[42rem] self-start"
          bodyClassName="flex flex-col gap-8 px-5 py-6 text-[15px] leading-relaxed text-ink-soft sm:px-8 sm:py-8"
        >
          <div className="flex flex-col gap-3">
            <h1 className="font-signage text-[40px] leading-none text-ink">Privacy</h1>
            <p>Last updated 13 November 2026.</p>
          </div>

          <Section title="Without an account">
            <p>
              Your clubs, squads, match details and images stay in your browser (in its local
              storage). They are never sent to us. Graphics are made in your browser too.
            </p>
            <p>
              There are no analytics, no advertising and no tracking cookies. Fonts are served from
              teamsheet11.com, not from anyone else.
            </p>
          </Section>

          <Section title="Who is responsible">
            <p>
              teamsheet11 is run by {OPERATOR.name} (CVR {OPERATOR.cvr}), {OPERATOR.country}, who is
              responsible for your data (the data controller). Questions about your data go to{" "}
              <a href={mail} className={link}>
                {OPERATOR.privacyEmail}
              </a>
              .
            </p>
          </Section>

          <Section title="With an account">
            <p>An account is optional. If you make one, we store:</p>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              <li>your email address and name, and a hashed password if you use one</li>
              <li>
                if you sign in with Google, the name, email address and profile picture link Google
                shares with us
              </li>
              <li>your clubs, squads, match details and design settings</li>
              <li>the crests and photos you upload</li>
              <li>
                for each session, when it started, your IP address and your browser&apos;s name, to
                keep the account secure
              </li>
            </ul>
            <p>
              We use this only to provide the account: signing you in, saving your clubs, and
              sending the emails it needs (confirming your address and resetting your password). We
              don&apos;t sell it, we don&apos;t use it for marketing, and there are no newsletters.
            </p>
            <p>
              The legal basis is GDPR <span className="whitespace-nowrap">article 6(1)(b)</span>,
              providing the service you asked for, and{" "}
              <span className="whitespace-nowrap">article 6(1)(f)</span>, our legitimate interest in
              keeping it secure, such as limiting sign-in attempts.
            </p>
          </Section>

          <Section title="Where it is kept">
            <p>
              The website, the database and uploaded images are on Hetzner servers in Germany.
              Account emails are sent through Amazon Web Services in Frankfurt, Germany. Signing in
              with Google is covered by Google&apos;s own privacy policy. These companies act only
              on our instructions.
            </p>
            <p>
              Uploaded images can be opened by anyone who has their exact link. The links are long
              and random, but don&apos;t upload anything private.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              There is one cookie: the sign-in cookie, which the account needs to work. It is
              removed when you sign out. There are no others.
            </p>
          </Section>

          <Section title="How long it is kept">
            <p>
              Until you delete your account. Deleting it on{" "}
              <Link href="/account" className={link}>
                the account page
              </Link>{" "}
              removes the account, your saved clubs and your uploaded images at once. Copies in
              database backups are gone within three days. Server logs, which include IP addresses,
              are kept briefly to stop abuse and are overwritten automatically.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You can see, correct, download or delete your data, and object to how it is used. Most
              of this you can do yourself on the account page. For anything else, email{" "}
              <a href={mail} className={link}>
                {OPERATOR.privacyEmail}
              </a>{" "}
              and you&apos;ll get an answer within a month.
            </p>
            <p>
              If you&apos;re unhappy with how we handle your data, you can complain to{" "}
              <a href="https://www.datatilsynet.dk" className={link}>
                Datatilsynet
              </a>
              , the Danish data protection authority.
            </p>
          </Section>

          <Section title="Open source">
            <p>
              teamsheet11 is open source, so you can check what it does.{" "}
              <a href={SOURCE_URL} className={link}>
                Read the source code
              </a>
              .
            </p>
          </Section>
        </Window>
      </main>
    </div>
  );
}
