"use client";

/*
  Interface kit, in the same low-fi language as the stadium: 2px ink outlines, hard
  offset shadows instead of blur, square-ish corners (4px at most), Jersey for titles,
  and the referee's yellow card for whatever is selected or highlighted.
*/

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Select as BaseSelect } from "@base-ui/react/select";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { CaretUpDownIcon, XIcon } from "@phosphor-icons/react";
import clsx from "clsx";
import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "destructive";

const variants: Record<Variant, string> = {
  primary:
    "bg-card text-card-ink font-semibold border-2 border-card-ink shadow-[3px_3px_0_var(--card-ink)] lofi-press",
  secondary:
    "bg-paper text-ink border-2 border-ink shadow-[2px_2px_0_var(--ink)] hover:-translate-y-px hover:shadow-[3px_3px_0_var(--ink)] active:translate-x-px active:translate-y-px active:shadow-none",
  ghost: "text-ink-soft hover:text-ink hover:bg-well",
  danger: "text-danger hover:bg-danger/10",
  destructive: "bg-danger text-paper font-semibold hover:brightness-110",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "icon" }
>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-[4px] whitespace-nowrap transition-[background-color,border-color,color,filter,translate,box-shadow] duration-150 select-none disabled:pointer-events-none disabled:opacity-45",
        size === "md" && "h-10 px-4 text-sm",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "icon" && "size-9",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
});

export function Field({
  label,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-snug text-ink-soft">{hint}</p>}
    </div>
  );
}

/** Inputs sit in an ink frame; focus adds the yellow-card shadow instead of a glow. */
export const inputClass =
  "h-10 w-full min-w-0 rounded-[3px] border-2 border-ink/30 bg-paper px-3 text-sm text-ink placeholder:text-ink-soft/80 transition-[border-color,box-shadow] hover:border-ink/60 focus:border-ink focus:shadow-[3px_3px_0_var(--card)] focus:outline-none focus-visible:outline-none focus-visible:shadow-[3px_3px_0_var(--card)]";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={clsx(inputClass, className)} {...rest} />;
  },
);

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(inputClass, "h-auto min-h-40 py-2.5 leading-relaxed", className)}
      {...rest}
    />
  );
}

/** Label-above text field. */
export function TextField({
  label,
  hint,
  value,
  onChange,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const generated = useId();
  // A passed id (e.g. one "Fix it" jumps to) wins, and the label follows it.
  const id = rest.id ?? generated;
  return (
    <Field label={label} hint={hint} htmlFor={id} className={className}>
      <TextInput {...rest} id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  tone = "paper",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  label: string;
  className?: string;
  /** "grass" for controls sitting on the pitch-green stage. */
  tone?: "paper" | "grass";
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as T)}
      className={clsx(
        "flex gap-0.5 rounded-[4px] p-0.5",
        tone === "paper"
          ? "border-2 border-ink bg-paper shadow-[2px_2px_0_var(--ink)]"
          : "border-2 border-card-ink bg-grass-deep shadow-[3px_3px_0_var(--card-ink)]",
        className,
      )}
    >
      {options.map((o) => (
        <Toggle
          key={o.value}
          value={o.value}
          title={o.title}
          className={clsx(
            "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[2px] px-2.5 text-[13px] whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-0",
            tone === "paper"
              ? "text-ink-soft hover:text-ink focus-visible:outline-ink data-pressed:bg-ink data-pressed:text-paper"
              : "text-chalk/70 hover:text-chalk focus-visible:outline-card data-pressed:bg-chalk data-pressed:text-grass-deep",
          )}
        >
          {o.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}

export function SwitchRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <label htmlFor={id} className="flex flex-col text-sm text-ink">
        {label}
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </label>
      <BaseSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-[3px] border-2 border-ink bg-well p-[3px] transition-colors data-checked:bg-card"
      >
        <BaseSwitch.Thumb className="size-[18px] rounded-[2px] bg-ink-soft transition-[translate,background-color] duration-150 ease-out-quint data-checked:translate-x-5 data-checked:bg-card-ink" />
      </BaseSwitch.Root>
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  items,
  label,
  hideLabel,
  className,
  triggerClassName,
  id,
}: {
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string }[];
  label: string;
  hideLabel?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Put on the trigger, so "Fix it" can focus it. */
  id?: string;
}) {
  return (
    <BaseSelect.Root
      items={items}
      value={value}
      onValueChange={(v) => v !== null && onChange(v as T)}
    >
      <div className={clsx("flex min-w-0 flex-col gap-1.5", className)}>
        <BaseSelect.Label
          className={clsx("text-[13px] font-semibold text-ink", hideLabel && "sr-only")}
        >
          {label}
        </BaseSelect.Label>
        <BaseSelect.Trigger
          id={id}
          className={clsx(
            "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[3px] border-2 px-3 text-left text-sm transition-[border-color,box-shadow]",
            triggerClassName ??
              "border-ink/30 bg-paper text-ink hover:border-ink/60 data-popup-open:border-ink data-popup-open:shadow-[3px_3px_0_var(--card)]",
          )}
        >
          <BaseSelect.Value className="truncate" />
          <BaseSelect.Icon className="opacity-60">
            <CaretUpDownIcon size={14} />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
      </div>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          className="z-50 outline-none"
          sideOffset={6}
          alignItemWithTrigger={false}
        >
          <BaseSelect.Popup className="max-h-[min(22rem,var(--available-height))] min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-[4px] border-2 border-edge bg-paper p-1 text-ink shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <BaseSelect.List>
              {items.map((item) => (
                <BaseSelect.Item
                  key={item.value}
                  value={item.value}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-[2px] py-2 pr-3 pl-2 text-sm outline-none select-none data-highlighted:bg-card data-highlighted:text-card-ink data-selected:font-semibold"
                >
                  <BaseSelect.ItemIndicator>
                    <span aria-hidden className="block size-2 bg-current" />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className="col-start-2">{item.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format = (v: number) => `${Math.round(v * 100)}%`,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <BaseSlider.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between text-[13px]">
        <BaseSlider.Label className="font-semibold text-ink">{label}</BaseSlider.Label>
        <span className="text-ink-soft tabular-nums">{format(value)}</span>
      </div>
      <BaseSlider.Control className="flex h-6 w-full touch-none items-center select-none">
        <BaseSlider.Track className="h-2 w-full rounded-[1px] border border-ink/30 bg-well">
          <BaseSlider.Indicator className="bg-ink" />
          <BaseSlider.Thumb className="h-6 w-4 rounded-[2px] border-2 border-ink bg-card shadow-[2px_2px_0_var(--ink)]" />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-[rgb(var(--shadow)/0.45)] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <BaseDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-1/2 flex-col overflow-hidden rounded-[4px] border-2 border-edge bg-paper text-ink shadow-[8px_8px_0_var(--edge)] transition-[scale,opacity] duration-200 ease-out-quint data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          {/* A title bar like the stadium windows. */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-edge bg-grass-deep py-2 pr-2 pl-4">
            <BaseDialog.Title className="flex items-center gap-2.5 font-signage text-[26px] leading-none text-chalk">
              <span aria-hidden className="size-3 shrink-0 border-2 border-card-ink bg-card" />
              {title}
            </BaseDialog.Title>
            <BaseDialog.Close
              aria-label="Close"
              className="grid size-9 place-items-center rounded-[3px] text-chalk/80 hover:bg-chalk/10 hover:text-chalk"
            >
              <XIcon size={18} weight="bold" />
            </BaseDialog.Close>
          </div>
          <div className="flex flex-col gap-5 overflow-y-auto p-5">
            {description && (
              <BaseDialog.Description className="text-sm leading-relaxed text-ink-soft">
                {description}
              </BaseDialog.Description>
            )}
            {children}
            {footer && <div className="flex flex-wrap justify-end gap-2">{footer}</div>}
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-b-2 border-rule px-5 py-6 last:border-b-0">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-signage text-[26px] leading-none">
          <span aria-hidden className="size-2.5 shrink-0 bg-card outline-2 outline-card-ink" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export interface MenuEntry {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

export function MenuButton({
  trigger,
  label,
  items,
  align = "end",
  triggerClassName,
}: {
  trigger: ReactNode;
  label: string;
  items: (MenuEntry | "separator")[];
  align?: "start" | "end";
  triggerClassName?: string;
}) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger aria-label={label} className={triggerClassName}>
        {trigger}
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={8} align={align} className="z-50 outline-none">
          <BaseMenu.Popup className="min-w-56 origin-(--transform-origin) rounded-[4px] border-2 border-edge bg-paper p-1 text-ink shadow-[5px_5px_0_var(--edge)] transition-[scale,opacity] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {items.map((item, i) =>
              item === "separator" ? (
                <BaseMenu.Separator key={i} className="mx-1 my-1 h-0.5 bg-rule" />
              ) : item.hidden ? null : (
                <BaseMenu.Item
                  key={item.label}
                  onClick={item.onSelect}
                  className={clsx(
                    "flex cursor-default items-center gap-2.5 rounded-[2px] px-2.5 py-2 text-sm outline-none select-none",
                    item.danger
                      ? "text-danger data-highlighted:bg-danger data-highlighted:text-paper"
                      : "data-highlighted:bg-card data-highlighted:text-card-ink",
                  )}
                >
                  {item.icon}
                  {item.label}
                </BaseMenu.Item>
              ),
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

/**
 * Keyboard behaviour for a group of role="radio" buttons: the group is one tab
 * stop, and the arrow keys move to and pick the previous or next option.
 */
export function radioGroupKeys(e: React.KeyboardEvent<HTMLElement>) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step) return;
  const radios = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
  const at = radios.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  e.preventDefault();
  const next = radios[(at + step + radios.length) % radios.length];
  next.focus();
  next.click();
}

/** Only the checked option (or the first, if none is) can be tabbed to. */
export function rovingTabIndex(checked: boolean, index: number, anyChecked: boolean): number {
  return checked || (!anyChecked && index === 0) ? 0 : -1;
}
