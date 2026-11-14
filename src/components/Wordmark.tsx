import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("landing");
  // A size in `className` replaces the default (two text-[…] classes don't override by order).
  const size = /(^|\s)text-\[/.test(className) ? "" : "text-[26px]";
  return (
    <Link
      href="/"
      // The home page is heavy (it renders sample graphics); fetch it on click, not on view.
      prefetch={false}
      aria-label={t("wordmark", { app: APP_NAME })}
      className={`inline-flex items-center gap-[0.22em] rounded-md leading-none ${size} ${className}`}
    >
      <span className="font-signage tracking-tight">teamsheet</span>
      <CardMark />
    </Link>
  );
}
