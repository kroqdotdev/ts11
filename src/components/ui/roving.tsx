"use client";

import {
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";

const TEXT_TYPES = new Set(["text", "search", "tel", "url", "email", "number", ""]);

/**
 * One Tab stop for a whole list of editable rows. Mark each row `data-row` and each
 * control in it `data-cell`. Up and Down move between rows (same column), Left and
 * Right between controls in a row (text fields let the caret move first). Tab leaves
 * the list from wherever you are, and coming back lands on the last control used.
 */
export function RovingList({
  as: Tag = "ol",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "ol" | "ul" }) {
  const ref = useRef<HTMLElement>(null);
  const active = useRef<HTMLElement | null>(null);

  // After each render exactly one control in the list is tabbable.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cells = [...root.querySelectorAll<HTMLElement>("[data-cell]")];
    if (cells.length === 0) return;
    const keep = active.current && cells.includes(active.current) ? active.current : cells[0];
    for (const c of cells) c.tabIndex = c === keep ? 0 : -1;
  });

  function move(to: HTMLElement | undefined, e: KeyboardEvent) {
    if (!to) return;
    e.preventDefault();
    to.focus();
    to.scrollIntoView({ block: "nearest" });
  }

  function onFocus(e: FocusEvent) {
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!cell || !ref.current?.contains(cell)) return;
    active.current = cell;
    for (const c of ref.current.querySelectorAll<HTMLElement>("[data-cell]"))
      c.tabIndex = c === cell ? 0 : -1;
  }

  function onKeyDown(e: KeyboardEvent) {
    const root = ref.current;
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!root || !cell || e.altKey || e.ctrlKey || e.metaKey) return;
    // A row being moved with the keyboard (dnd-kit) owns the arrow keys.
    if (cell.getAttribute("aria-roledescription") && cell.getAttribute("aria-pressed") === "true")
      return;
    const row = cell.closest<HTMLElement>("[data-row]");
    if (!row) return;
    const cellsIn = (r: Element) => [...r.querySelectorAll<HTMLElement>("[data-cell]")];
    const rowCells = cellsIn(row);
    const col = rowCells.indexOf(cell);
    const input = cell instanceof HTMLInputElement && TEXT_TYPES.has(cell.type) ? cell : null;

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      if (input) {
        const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
        const atEnd =
          input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
        if (e.key === "ArrowLeft" ? !atStart : !atEnd) return;
      }
      move(rowCells[col + (e.key === "ArrowLeft" ? -1 : 1)], e);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      // A name field with suggestions keeps Up and Down once something is typed.
      if (input?.list && input.value) return;
      const rows = [...root.querySelectorAll<HTMLElement>("[data-row]")];
      const next = rows[rows.indexOf(row) + (e.key === "ArrowUp" ? -1 : 1)];
      if (!next) return;
      const nextCells = cellsIn(next);
      move(nextCells[Math.min(col, nextCells.length - 1)], e);
    }
  }

  return (
    <Tag
      ref={ref as React.Ref<HTMLOListElement & HTMLUListElement>}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      {...rest}
    />
  );
}
