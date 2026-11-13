import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Window } from "@/components/lofi/Window";
import { Wordmark } from "@/components/Wordmark";
import { SOURCE_URL } from "@/lib/brand";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What teamsheet11 stores about you, where, for how long, and how to delete it.",
};

const UPDATED = "13 November 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-signage text-[26px] leading-tight text-ink">{title}</h2>
      <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

const mail = (
  <a
    className="font-medium text-ink underline underline-offset-4"
    href={`mailto:${OPERATOR.privacyEmail}`}
  >
    {OPERATOR.privacyEmail}
  </a>
);

export default function Page() {
  return (
    <main className="flex min-h-dvh flex-col pixel-turf bg-grass-deep">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 lg:px-8">
        <span className="rounded-[4px] bg-[#10151c]/85 px-2.5 py-1.5 text-chalk">
          <Wordmark className="text-[24px]" />
        </span>
        <Link
          href="/studio"
          className="lofi-press rounded-[4px] border-2 border-card-ink bg-paper px-3 py-1.5 text-sm font-medium text-ink shadow-[3px_3px_0_var(--card-ink)]"
        >
          Open the studio
        </Link>
      </header>
      <div className="flex flex-1 justify-center px-4 pt-4 pb-16">
        <Window
          title="privacy.txt"
          className="w-full max-w-2xl"
          bodyClassName="flex flex-col gap-7 p-5 sm:p-8"
        >
          <div className="flex flex-col gap-2">
            <h1 className="font-signage text-[40px] leading-none text-ink">Privacy</h1>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              teamsheet11 is a free tool for making match day graphics. You can use all of it
              without an account, and then nothing about you or your club leaves your browser. This
              page explains what changes if you make an account. Last updated {UPDATED}.
            </p>
          </div>

          <Section title="Who runs it">
            <p>
              teamsheet11.com is run by {OPERATOR.name} (CVR {OPERATOR.cvr}, {OPERATOR.country}),
              which is responsible for the personal data described here. Questions and requests go
              to {mail}.
            </p>
          </Section>

          <Section title="Without an account">
            <p>
              Your clubs, squads, match details and images are saved in your own browser
              (localStorage). We never receive them. Graphics are made in your browser too.
            </p>
            <p>
              The site uses no analytics, no advertising and no tracking cookies. Fonts are served
              from teamsheet11.com itself.
            </p>
          </Section>

          <Section title="With an account">
            <p>When you make an account, we store:</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>your email address and name, and a hashed password if you use one;</li>
              <li>
                if you sign in with Google: the name, email address and profile picture link Google
                shares;
              </li>
              <li>
                your clubs, squads, match details and design settings, so they reach your other
                devices;
              </li>
              <li>the crests and photos you upload;</li>
              <li>
                for each signed-in session: when it started, its IP address and your browser&apos;s
                name, to keep the account secure.
              </li>
            </ul>
            <p>
              We use this only to run the service you asked for: signing you in, saving your clubs
              and sending the emails the account needs (confirming your address, resetting your
              password). Nothing is sold or shared for marketing, and we don&apos;t send
              newsletters.
            </p>
            <p>
              The legal basis is the agreement to provide the account (GDPR article 6(1)(b)), and
              our legitimate interest in keeping it secure, such as limiting repeated sign-in
              attempts (article 6(1)(f)).
            </p>
          </Section>

          <Section title="Where it's kept">
            <p>
              The website, its database and uploaded images are on servers run by Hetzner in
              Germany. Account emails are sent through Amazon Web Services in Frankfurt, Germany. If
              you choose Google sign-in, Google handles that step under its own privacy policy. All
              of these act on our instructions only.
            </p>
            <p>
              Uploaded images can be opened by anyone who has their exact link, which is long and
              random. Don&apos;t upload anything private.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Signing in sets one cookie that keeps you signed in. It&apos;s needed for the account
              to work and is removed when you sign out. There are no other cookies.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p>
              Until you delete your account. Deleting it, on the{" "}
              <Link className="font-medium text-ink underline underline-offset-4" href="/account">
                account page
              </Link>
              , removes the account, your saved clubs and your uploaded images straight away. Copies
              in our database backups disappear within three days. Server logs, which include IP
              addresses, are kept only briefly to deal with abuse and are overwritten automatically.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You can see, correct, download or delete your data, and object to how it&apos;s used.
              Most of this you can do yourself on the account page; for anything else, email {mail}{" "}
              and you&apos;ll get an answer within a month.
            </p>
            <p>
              If you think we handle your data wrongly, you can complain to the Danish Data
              Protection Agency,{" "}
              <a
                className="font-medium text-ink underline underline-offset-4"
                href="https://www.datatilsynet.dk"
              >
                Datatilsynet
              </a>
              .
            </p>
          </Section>

          <Section title="Open source">
            <p>
              teamsheet11 is open source, so you can check exactly what it does with your data:{" "}
              <a className="font-medium text-ink underline underline-offset-4" href={SOURCE_URL}>
                the source code is on GitHub
              </a>
              .
            </p>
          </Section>
        </Window>
      </div>
    </main>
  );
}
