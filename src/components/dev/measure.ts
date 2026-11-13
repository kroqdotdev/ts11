/**
 * Layout checks for rendered graphics, run in the browser by `pnpm check:graphics`.
 *
 * Every visible text run inside a graphic is measured, in native graphic pixels:
 *   out       text runs past the edge of the canvas
 *   clipped   text is cut off by an ancestor with overflow hidden, or truncated
 *   spill     text runs past the edge of the card or panel it sits on
 *   covered   something opaque is painted on top of the text
 *   overlap   two text runs collide
 *   small     text is below the readable minimum for the format
 *   orphan    a text run wraps and leaves a line of one or two letters ("S." / "ELLERY")
 *   uneven    rows of a list marked `data-check-list` are set at different sizes
 *   empty     a badge marked `data-check-slot` (shirt number, minute) prints empty
 *
 * Rotated text (the Sash poster) is measured as rotated quads, not bounding boxes.
 * Decorative text (giant outline lettering, faint watermarks) is skipped when it,
 * or an ancestor, has `data-decor`, or when it is mostly transparent.
 */

export interface Problem {
  rule:
    "out" | "clipped" | "spill" | "covered" | "overlap" | "small" | "orphan" | "uneven" | "empty";
  text: string;
  detail: string;
  /** Native-pixel box of the offending text, for drawing failure overlays. */
  box: { x: number; y: number; w: number; h: number };
}

/** Readable minimum font size, in native pixels, on a 1080-wide graphic. */
export const MIN_TEXT = 20;
const TOLERANCE = 2;

type Pt = { x: number; y: number };
type Quad = Pt[];

interface Run {
  el: Element;
  text: string;
  /** One quad per line, in viewport pixels (rotated when the text is rotated). */
  lines: Quad[];
  box: DOMRect;
  /** Visible characters on each line, when the run wraps. */
  perLine: number[];
}

function decorative(el: Element, root: Element): boolean {
  let opacity = 1;
  for (let e: Element | null = el; e && e !== root.parentElement; e = e.parentElement) {
    if (e.hasAttribute("data-decor")) return true;
    const cs = getComputedStyle(e);
    if (cs.visibility === "hidden" || cs.display === "none") return true;
    opacity *= Number(cs.opacity);
  }
  if (opacity < 0.4) return true;
  const cs = getComputedStyle(el);
  const alpha = colorAlpha(cs.color);
  // Outline lettering: transparent fill with a stroke.
  const stroke = cs.getPropertyValue("-webkit-text-stroke-width");
  if (alpha < 0.4 && (!stroke || stroke === "0px")) return true;
  if (alpha < 0.05) return true;
  return false;
}

function colorAlpha(color: string): number {
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) return 1;
  const parts = m[1].split(/[,/\s]+/).filter(Boolean);
  return parts.length >= 4 ? Number(parts[3]) : 1;
}

/** The nearest ancestor inside the graphic that rotates or skews its content. */
function rotator(el: Element, root: Element): HTMLElement | null {
  for (let e: Element | null = el; e && e !== root; e = e.parentElement) {
    const t = getComputedStyle(e).transform;
    if (t && t !== "none") {
      const m = new DOMMatrix(t);
      if (Math.abs(m.b) > 1e-3 || Math.abs(m.c) > 1e-3) return e as HTMLElement;
    }
  }
  return null;
}

function rectQuad(r: DOMRect): Quad {
  return [
    { x: r.left, y: r.top },
    { x: r.right, y: r.top },
    { x: r.right, y: r.bottom },
    { x: r.left, y: r.bottom },
  ];
}

function quadBox(qs: Quad[]): DOMRect {
  const xs = qs.flat().map((p) => p.x);
  const ys = qs.flat().map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return new DOMRect(x, y, Math.max(...xs) - x, Math.max(...ys) - y);
}

function textNodes(root: Element): { node: Text; el: Element; text: string }[] {
  const out: { node: Text; el: Element; text: string }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent?.trim();
    const el = n.parentElement;
    if (!text || !el || decorative(el, root)) continue;
    out.push({ node: n as Text, el, text });
  }
  return out;
}

function lineRects(node: Text): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(node);
  return [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
}

/** Visible characters on each line of a wrapped text node. */
function charsPerLine(node: Text, rects: DOMRect[]): number[] {
  if (rects.length < 2) return [node.textContent?.trim().length ?? 0];
  const counts = rects.map(() => 0);
  const text = node.textContent ?? "";
  const range = document.createRange();
  for (let i = 0; i < text.length; i++) {
    if (!text[i].trim()) continue;
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const r = range.getBoundingClientRect();
    const cy = r.top + r.height / 2;
    let best = 0;
    for (let j = 1; j < rects.length; j++)
      if (
        Math.abs(rects[j].top + rects[j].height / 2 - cy) <
        Math.abs(rects[best].top + rects[best].height / 2 - cy)
      )
        best = j;
    counts[best]++;
  }
  return counts;
}

function runs(root: Element): Run[] {
  const out: Run[] = [];
  const groups = new Map<HTMLElement | null, { node: Text; el: Element; text: string }[]>();
  for (const t of textNodes(root)) {
    const r = rotator(t.el, root);
    groups.set(r, [...(groups.get(r) ?? []), t]);
  }
  for (const [rot, items] of groups) {
    if (!rot) {
      for (const t of items) {
        const rects = lineRects(t.node);
        if (rects.length)
          out.push({
            el: t.el,
            text: t.text,
            lines: rects.map(rectQuad),
            box: quadBox(rects.map(rectQuad)),
            perLine: charsPerLine(t.node, rects),
          });
      }
      continue;
    }
    // Measure the text with the rotation switched off, then rotate the line boxes
    // about the element's transform origin the way the browser paints them.
    const cs = getComputedStyle(rot);
    const m = new DOMMatrix(cs.transform);
    const [ox, oy] = cs.transformOrigin.split(" ").map((v) => Number.parseFloat(v));
    const prev = rot.style.transform;
    rot.style.transform = "none";
    const host = rot.getBoundingClientRect();
    // Positions on screen are scaled by the check gallery; the rotation is not.
    const k = host.width / Math.max(1, rot.offsetWidth);
    const origin = { x: host.left + ox * k, y: host.top + oy * k };
    const measured = items.map((t) => {
      const rects = lineRects(t.node);
      return { t, rects, perLine: charsPerLine(t.node, rects) };
    });
    rot.style.transform = prev;
    const turn = (p: Pt): Pt => {
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      return {
        x: origin.x + m.a * dx + m.c * dy + m.e * k,
        y: origin.y + m.b * dx + m.d * dy + m.f * k,
      };
    };
    for (const { t, rects, perLine } of measured) {
      if (!rects.length) continue;
      const quads = rects.map((r) => rectQuad(r).map(turn));
      out.push({ el: t.el, text: t.text, lines: quads, box: quadBox(quads), perLine });
    }
  }
  return out;
}

function clipBox(el: Element, root: Element): DOMRect | null {
  let box: DOMRect | null = null;
  for (let e = el.parentElement; e && e !== root.parentElement; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
      const r = e.getBoundingClientRect();
      box = box ? intersect(box, r) : r;
    }
  }
  return box;
}

/**
 * The nearest ancestor drawn as a card or panel (an opaque background or a border),
 * ignoring full-canvas layers. Text should stay inside it.
 */
function cardBox(el: Element, root: Element, frame: DOMRect): DOMRect | null {
  for (let e = el.parentElement; e && e !== root; e = e.parentElement) {
    if (rotator(e, root) === e) return null;
    const cs = getComputedStyle(e);
    const bg = colorAlpha(cs.backgroundColor) > 0.5;
    const border = Number.parseFloat(cs.borderLeftWidth) > 0 && cs.borderLeftStyle !== "none";
    if (!bg && !border) continue;
    const r = e.getBoundingClientRect();
    if (r.width > frame.width * 0.95 && r.height > frame.height * 0.95) return null;
    return r;
  }
  return null;
}

function intersect(a: DOMRect, b: DOMRect): DOMRect {
  const x = Math.max(a.left, b.left);
  const y = Math.max(a.top, b.top);
  const r = Math.min(a.right, b.right);
  const bt = Math.min(a.bottom, b.bottom);
  return new DOMRect(x, y, Math.max(0, r - x), Math.max(0, bt - y));
}

/** Area of a convex polygon. */
function polyArea(p: Quad): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/** Sutherland–Hodgman: the part of convex polygon `subject` inside convex `clip`. */
function clipPoly(subject: Quad, clip: Quad): Quad {
  let out = subject;
  const sign = Math.sign(cross(clip[0], clip[1], clip[2])) || 1;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = out;
    out = [];
    const inside = (p: Pt) => sign * cross(a, b, p) >= 0;
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const ci = inside(cur);
      const pi = inside(prev);
      if (ci) {
        if (!pi) out.push(cut(prev, cur, a, b));
        out.push(cur);
      } else if (pi) out.push(cut(prev, cur, a, b));
    }
  }
  return out;
}

function cross(a: Pt, b: Pt, p: Pt) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function cut(p: Pt, q: Pt, a: Pt, b: Pt): Pt {
  const d1 = cross(a, b, p);
  const d2 = cross(a, b, q);
  const t = d1 / (d1 - d2);
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

/** Shrinks a line quad to the glyph core: line boxes include leading above and below. */
function core(q: Quad): Quad {
  const [a, b, c, d] = q;
  const t = 0.18;
  const mixPt = (p: Pt, r: Pt, f: number) => ({
    x: p.x + (r.x - p.x) * f,
    y: p.y + (r.y - p.y) * f,
  });
  return [mixPt(a, d, t), mixPt(b, c, t), mixPt(c, b, t), mixPt(d, a, t)];
}

function related(a: Element, b: Element) {
  return a === b || a.contains(b) || b.contains(a);
}

/** The nearest absolutely positioned box the layout placed the text in. */
function placedBox(el: Element, root: Element, frame: DOMRect): DOMRect | null {
  for (let e: Element | null = el; e && e !== root; e = e.parentElement) {
    if (getComputedStyle(e).position !== "absolute") continue;
    if (rotator(e, root)) return null;
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;
    if (r.width > frame.width * 0.98 && r.height > frame.height * 0.98) return null;
    return r;
  }
  return null;
}

/** The first opaque thing painted under the text at a point. */
function backdropAt(run: Run, x: number, y: number): Element | null {
  for (const e of document.elementsFromPoint(x, y)) {
    if (related(e, run.el)) continue;
    const cs = getComputedStyle(e);
    if (e instanceof SVGElement || colorAlpha(cs.backgroundColor) > 0.5 || e.tagName === "IMG")
      return e;
  }
  return null;
}

/**
 * True when a line starts on a card (something smaller than the canvas) and ends off
 * it: the card is a sibling drawn underneath rather than an ancestor.
 */
function leavesCard(run: Run, q: Quad, frame: DOMRect): boolean {
  const [a, b, c, d] = q;
  const at = (f: number) => ({
    x: (a.x + d.x) / 2 + ((b.x + c.x) / 2 - (a.x + d.x) / 2) * f,
    y: (a.y + d.y) / 2 + ((b.y + c.y) / 2 - (a.y + d.y) / 2) * f,
  });
  const p0 = at(0.04);
  const p1 = at(0.96);
  const start = backdropAt(run, p0.x, p0.y);
  if (!start || start instanceof SVGElement) return false;
  const box = start.getBoundingClientRect();
  if (box.width > frame.width * 0.9 || box.height > frame.height * 0.9) return false;
  // Only cards: the line must start well inside it.
  if (p0.x < box.left || p0.x > box.right) return false;
  const end = backdropAt(run, p1.x, p1.y);
  if (!end) return false;
  return (
    !(end === start || start.contains(end) || end.contains(start)) &&
    (p1.x > box.right + 2 || p1.x < box.left - 2 || p1.y > box.bottom + 2 || p1.y < box.top - 2)
  );
}

/** The element painted on top of the text at a point, when it isn't the text itself. */
function coveredAt(run: Run, x: number, y: number): Element | null {
  for (const top of document.elementsFromPoint(x, y)) {
    if (related(top, run.el)) return null;
    const cs = getComputedStyle(top);
    if (top.closest("[data-decor]") || top.hasAttribute("data-check-mark")) continue;
    const fill = top instanceof SVGElement ? 1 : colorAlpha(cs.backgroundColor);
    // Gradients over text are deliberate texture (scanlines, vignettes); pictures aren't.
    const img = top.tagName === "IMG" || cs.backgroundImage.includes("url(");
    if (fill < 0.5 && !img) continue;
    return top;
  }
  return null;
}

export function measureGraphic(root: HTMLElement, nativeWidth: number): Problem[] {
  // Hit-testing skips pointer-events: none, which graphics use freely; turn it back
  // on everywhere while measuring so "covered" means painted on top.
  if (!document.getElementById("check-hit-style")) {
    const style = document.createElement("style");
    style.id = "check-hit-style";
    style.textContent = "[data-check-id] * { pointer-events: auto !important; }";
    document.head.appendChild(style);
  }
  const frame = root.getBoundingClientRect();
  const scale = frame.width / nativeWidth;
  // Wide posts are shown at about the same width on screen, so the minimum scales with width.
  const min = (MIN_TEXT * nativeWidth) / 1080;
  const native = (r: DOMRect) => ({
    x: Math.round((r.left - frame.left) / scale),
    y: Math.round((r.top - frame.top) / scale),
    w: Math.round(r.width / scale),
    h: Math.round(r.height / scale),
  });
  const problems: Problem[] = [];
  // Escape hatch for a deliberate exception: data-check-allow="spill overlap" on an element.
  const push = (el: Element, p: Problem) => {
    if (!el.closest(`[data-check-allow~="${p.rule}"]`)) problems.push(p);
  };
  const all = runs(root);
  const tol = TOLERANCE * scale;
  const outside = (q: Quad, box: DOMRect) =>
    q.some(
      (p) =>
        p.x < box.left - tol ||
        p.x > box.right + tol ||
        p.y < box.top - tol ||
        p.y > box.bottom + tol,
    );

  for (const run of all) {
    const b = run.box;
    const short = run.text.length > 40 ? run.text.slice(0, 40) + "…" : run.text;

    if (run.lines.some((q) => outside(core(q), frame))) {
      push(run.el, {
        rule: "out",
        text: short,
        detail: "runs past the canvas edge",
        box: native(b),
      });
      continue;
    }

    const clip = clipBox(run.el, root);
    if (clip) {
      const lineArea = run.lines.reduce((s, q) => s + polyArea(q), 0);
      const kept = run.lines.reduce((s, q) => s + polyArea(clipPoly(q, rectQuad(clip))), 0);
      const hidden = 1 - kept / Math.max(1, lineArea);
      if (hidden > 0.04)
        push(run.el, {
          rule: "clipped",
          text: short,
          detail: `${Math.round(hidden * 100)}% cut off by its container`,
          box: native(b),
        });
    }

    const card = cardBox(run.el, root, frame);
    if (
      (card && run.lines.some((q) => outside(core(q), card))) ||
      run.lines.some((q) => leavesCard(run, q, frame)) ||
      // Text sized a hair over its box is fine; past it by a clear margin is a layout bug.
      ((placed) =>
        !!placed &&
        run.lines.some((q) =>
          outside(
            core(q),
            new DOMRect(
              placed.x - 22 * scale,
              placed.y - 22 * scale,
              placed.width + 44 * scale,
              placed.height + 44 * scale,
            ),
          ),
        ))(placedBox(run.el, root, frame))
    ) {
      push(run.el, {
        rule: "spill",
        text: short,
        detail: "runs past the edge of the card it sits on",
        box: native(b),
      });
    }

    // Ellipsis or nowrap overflow inside the element itself.
    const el = run.el as HTMLElement;
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible") {
      push(run.el, {
        rule: "clipped",
        text: short,
        detail: "truncated inside its box",
        box: native(b),
      });
    }

    const size = Number.parseFloat(getComputedStyle(run.el).fontSize);
    if (size < min - 0.5) {
      push(run.el, {
        rule: "small",
        text: short,
        detail: `${Math.round(size)}px text, minimum ${Math.round(min)}px`,
        box: native(b),
      });
    }

    if (run.perLine.length > 1 && run.perLine.some((n) => n > 0 && n <= 2)) {
      push(run.el, {
        rule: "orphan",
        text: short,
        detail: `wraps onto ${run.perLine.length} lines, leaving ${Math.min(...run.perLine)} letter(s) alone`,
        box: native(b),
      });
    }

    // Sample a few points along each line; a hit on something unrelated means it's covered.
    for (const q of run.lines) {
      const [a, bq, c, d] = q;
      const at = (f: number) => ({
        x: (a.x + d.x) / 2 + ((bq.x + c.x) / 2 - (a.x + d.x) / 2) * f,
        y: (a.y + d.y) / 2 + ((bq.y + c.y) / 2 - (a.y + d.y) / 2) * f,
      });
      const hit = [0.15, 0.5, 0.85]
        .map(at)
        .map((p) => coveredAt(run, p.x, p.y))
        .find(Boolean);
      if (hit) {
        push(run.el, {
          rule: "covered",
          text: short,
          detail: `hidden under <${hit.tagName.toLowerCase()}>`,
          box: native(quadBox([q])),
        });
        break;
      }
    }
  }

  // Layouts that break lines themselves: a block holding only an initial or "(C)",
  // stacked under or over a block of the same size, is a name split in two.
  for (const run of all) {
    const own = run.el.textContent?.trim() ?? "";
    if (!/^\(?[A-Za-z]{1,2}\.?\)?$/.test(own) || /^(v|vs|at|H|A)$/i.test(own)) continue;
    const size = Number.parseFloat(getComputedStyle(run.el).fontSize);
    const box = run.el.getBoundingClientRect();
    const near = [run.el.previousElementSibling, run.el.nextElementSibling].filter(
      (e): e is Element => !!e && !!e.textContent?.trim(),
    );
    const stacked = near.some((e) => {
      const r = e.getBoundingClientRect();
      const s2 = Number.parseFloat(getComputedStyle(e).fontSize);
      const vertical = r.bottom <= box.top + 2 || r.top >= box.bottom - 2;
      return vertical && Math.abs(s2 - size) / size < 0.15;
    });
    if (stacked)
      push(run.el, {
        rule: "orphan",
        text: own,
        detail: "sits alone on its own line, split from the rest of the name",
        box: native(box),
      });
  }

  for (const slot of root.querySelectorAll<HTMLElement>("[data-check-slot]")) {
    if (slot.textContent?.trim() || slot.querySelector("img,svg")) continue;
    push(slot, {
      rule: "empty",
      text: slot.dataset.checkSlot || "slot",
      detail: "an empty badge where a value should be",
      box: native(slot.getBoundingClientRect()),
    });
  }

  // Lists (a line-up, scorers, fixtures) should read as one block: one size per row.
  for (const list of root.querySelectorAll<HTMLElement>("[data-check-list]")) {
    const sizes = [...list.children]
      .map((row) => {
        const own = all.filter((r) => row.contains(r.el));
        return own.length
          ? Math.max(...own.map((r) => Number.parseFloat(getComputedStyle(r.el).fontSize)))
          : 0;
      })
      .filter(Boolean);
    if (sizes.length > 1 && Math.max(...sizes) / Math.min(...sizes) > 1.1) {
      push(list, {
        rule: "uneven",
        text: list.dataset.checkList || "list",
        detail: `rows set from ${Math.round(Math.min(...sizes))}px to ${Math.round(Math.max(...sizes))}px`,
        box: native(list.getBoundingClientRect()),
      });
    }
  }

  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i];
      const c = all[j];
      if (related(a.el, c.el)) continue;
      if (area(intersect(a.box, c.box)) === 0) continue;
      let hit: Quad | null = null;
      for (const la of a.lines) {
        for (const lc of c.lines) {
          const ia = core(la);
          const ic = core(lc);
          const ov = polyArea(clipPoly(ia, ic));
          if (ov > 0.12 * Math.min(polyArea(ia), polyArea(ic))) {
            hit = la;
            break;
          }
        }
        if (hit) break;
      }
      if (hit)
        push(a.el, {
          rule: "overlap",
          text: `${a.text.slice(0, 24)} × ${c.text.slice(0, 24)}`,
          detail: "two pieces of text collide",
          box: native(quadBox([hit])),
        });
    }
  }
  return problems;
}

function area(r: DOMRect) {
  return r.width * r.height;
}
