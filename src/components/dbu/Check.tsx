"use client";

import { CheckIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/** A checkbox row in the low-fi style: ink frame, yellow card when ticked. */
export function Check({
  checked,
  onChange,
  disabled,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <label
      className={
        disabled
          ? "flex items-start gap-3 rounded-[3px] px-1 py-1.5 opacity-60"
          : "flex cursor-pointer items-start gap-3 rounded-[3px] px-1 py-1.5 hover:bg-well"
      }
    >
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer size-5 cursor-pointer appearance-none rounded-[2px] border-2 border-ink bg-paper checked:bg-card focus-visible:shadow-[2px_2px_0_var(--ink)] focus-visible:outline-none disabled:cursor-default"
        />
        <CheckIcon
          size={13}
          weight="bold"
          aria-hidden
          className="pointer-events-none absolute text-card-ink opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="flex min-w-0 flex-col text-sm leading-snug">
        <span className="font-medium">{title}</span>
        {detail && <span className="text-xs text-ink-soft">{detail}</span>}
      </span>
    </label>
  );
}
