import { keyLabel } from "@/lib/keys";

export const HOW_TO_STEP_COUNT = 9;

export const STEP = {
  add: 0,
  name: 1,
  key: 2,
  count: 3,
  undo: 4,
  limit: 5,
  presets: 6,
  save: 7,
  select: 8,
} as const;

export type HowToStep = (typeof STEP)[keyof typeof STEP];

export type CountSpotlight =
  | { kind: "keycap" }
  | { kind: "pad-key" }
  | { kind: "layout" }
  | { kind: "pad" };

type RowRef = { id: string };

export function tourRowId(startIds: readonly string[], rows: readonly RowRef[]): string | null {
  const start = new Set(startIds);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!start.has(rows[i].id)) return rows[i].id;
  }
  return rows.at(-1)?.id ?? null;
}

export function countSpotlight(key: string, keyOnPad: boolean, isHandset: boolean): CountSpotlight {
  if (!key) return { kind: "keycap" };
  if (keyOnPad) return { kind: "pad-key" };
  if (isHandset) return { kind: "pad" };
  return { kind: "layout" };
}

export type HowToAnchor =
  | "add-cell"
  | "cell-name"
  | "keycap"
  | "pad-key"
  | "layout"
  | "pad"
  | "minus"
  | "count-limit"
  | "presets"
  | "save-preset"
  | "save-dialog"
  | "select-preset"
  | "switch-dialog";

export function howToAnchor(opts: {
  step: HowToStep;
  rowId: string | null;
  key: string;
  keyOnPad: boolean;
  isHandset: boolean;
  savePresetVisible: boolean;
  saveDialogVisible: boolean;
  selectPresetVisible: boolean;
  switchDialogVisible: boolean;
}): HowToAnchor {
  if (opts.step === STEP.add) return "add-cell";
  if (opts.step === STEP.name) return opts.rowId ? "cell-name" : "add-cell";
  if (opts.step === STEP.key || (opts.step === STEP.count && !opts.key)) {
    return opts.rowId ? "keycap" : "add-cell";
  }
  if (opts.step === STEP.count) return countSpotlight(opts.key, opts.keyOnPad, opts.isHandset).kind;
  if (opts.step === STEP.undo) return "minus";
  if (opts.step === STEP.limit) return "count-limit";
  if (opts.step === STEP.presets) return "presets";
  if (opts.step === STEP.save) {
    if (opts.saveDialogVisible) return "save-dialog";
    if (opts.savePresetVisible) return "save-preset";
    return "presets";
  }
  if (opts.switchDialogVisible) return "switch-dialog";
  if (opts.saveDialogVisible) return "save-dialog";
  if (opts.selectPresetVisible) return "select-preset";
  if (opts.savePresetVisible) return "save-preset";
  return "presets";
}

export function selectStepSourceKey(source: { kind: string; id?: string }) {
  return source.kind === "saved" && source.id ? source.id : source.kind;
}

/** Ends the select step once a different preset is actually loaded. */
export function selectStepShouldFinish(
  baseline: string | null,
  source: { kind: string; id?: string },
) {
  const key = selectStepSourceKey(source);
  if (baseline === null) return { baseline: key, finish: false };
  return { baseline, finish: source.kind === "saved" && key !== baseline };
}

export function countStepBody(
  cellName: string,
  key: string,
  keyOnPad: boolean,
  isHandset: boolean,
): string {
  if (!key) return "This cell has no key yet. Set one, or continue.";
  if (keyOnPad) return "Press that key on your keyboard to add one.";
  const name = cellName.trim() || "This cell";
  const label = keyLabel(key);
  if (isHandset) return `${name} is on ${label}. Press that key.`;
  return `${name} is on ${label}. Switch the pad if you don’t see it, or press that key.`;
}

export type Hole = { cx: number; cy: number; r: number };

export function placeCoachCard(opts: {
  hole: Hole;
  card: { w: number; h: number };
  viewport: { w: number; h: number };
  handset: boolean;
  gap?: number;
  margin?: number;
}): { left: number; top: number } {
  const gap = opts.gap ?? 16;
  const margin = opts.margin ?? 16;
  const { hole, card, viewport } = opts;

  const clamp = (left: number, top: number) => ({
    left: Math.min(Math.max(left, margin), Math.max(margin, viewport.w - card.w - margin)),
    top: Math.min(Math.max(top, margin), Math.max(margin, viewport.h - card.h - margin)),
  });

  const candidates: { left: number; top: number }[] = [];
  if (opts.handset) {
    candidates.push(clamp(margin, viewport.h - card.h - margin));
    candidates.push(clamp(margin, margin));
  } else {
    const midY = hole.cy - card.h / 2;
    candidates.push(clamp(hole.cx + hole.r + gap, midY));
    candidates.push(clamp(hole.cx - hole.r - gap - card.w, midY));
    candidates.push(clamp(hole.cx - card.w / 2, hole.cy + hole.r + gap));
    candidates.push(clamp(hole.cx - card.w / 2, hole.cy - hole.r - gap - card.h));
  }

  const coversHole = (left: number, top: number) => {
    const pad = 8;
    const nearestX = Math.max(left, Math.min(hole.cx, left + card.w));
    const nearestY = Math.max(top, Math.min(hole.cy, top + card.h));
    const dx = hole.cx - nearestX;
    const dy = hole.cy - nearestY;
    return dx * dx + dy * dy < (hole.r + pad) * (hole.r + pad);
  };

  return candidates.find((candidate) => !coversHole(candidate.left, candidate.top)) ?? candidates[0];
}
