import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

/** The mark: a referee's card printed with the 11. */
export function CardMark({ className = "", tilt = 8 }: { className?: string; tilt?: number }) {
  return (
    <span
      aria-hidden
      style={{ rotate: `${tilt}deg` }}
      className={`inline-grid h-[1.45em] w-[1.05em] place-items-center rounded-[0.12em] bg-card font-signage text-[0.62em] leading-none text-card-ink shadow-[0.06em_0.08em_0_rgb(var(--shadow)/0.35)] ${className}`}
    >
      11
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${APP_NAME} home`}
      className={`inline-flex items-center gap-[0.22em] rounded-md text-[26px] leading-none ${className}`}
    >
      <span className="font-signage tracking-tight">teamsheet</span>
      <CardMark />
    </Link>
  );
}
