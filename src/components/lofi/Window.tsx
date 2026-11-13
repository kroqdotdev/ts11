import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * The low-fi panel: an ink outline, a hard shadow and a title bar. Used for the
 * setup questions, landing page panels and graphic previews.
 */
export function Window({
  title,
  right,
  children,
  className,
  bodyClassName,
  as: Tag = "section",
}: {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div" | "figure" | "form";
}) {
  return (
    <Tag
      className={clsx(
        "flex flex-col overflow-hidden rounded-[4px] border-2 border-card-ink bg-paper text-ink shadow-[6px_6px_0_var(--card-ink)]",
        className,
      )}
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b-2 border-card-ink bg-grass-deep px-3 text-chalk">
        <span className="truncate font-signage text-[20px] leading-none">{title}</span>
        {right}
      </div>
      <div className={clsx("min-h-0", bodyClassName)}>{children}</div>
    </Tag>
  );
}
