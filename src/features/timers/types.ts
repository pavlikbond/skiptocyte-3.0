export type TimerStatus = "running" | "paused" | "done";

/** Running-only wash. Pause stays ochre; done stays teal. */
export const RUN_COLORS = ["blue", "rose", "violet", "coral", "lime", "berry"] as const;
export type TimerRunColor = (typeof RUN_COLORS)[number];
export const DEFAULT_RUN_COLOR: TimerRunColor = "blue";

export const RUN_COLOR_LABELS: Record<TimerRunColor, string> = {
  blue: "Stain blue",
  rose: "Rose",
  violet: "Violet",
  coral: "Coral",
  lime: "Lime",
  berry: "Berry",
};

export function isRunColor(value: unknown): value is TimerRunColor {
  return typeof value === "string" && (RUN_COLORS as readonly string[]).includes(value);
}

export function coerceRunColor(value: unknown): TimerRunColor {
  return isRunColor(value) ? value : DEFAULT_RUN_COLOR;
}

export type BenchTimer = {
  id: string;
  title: string;
  /** Duration when the timer was started. Reset restores this. */
  initialMs: number;
  /** Current total, including time added while it was going. Drives the ring. */
  durationMs: number;
  /** Remaining when paused or done. Ignored while running. */
  remainingMs: number;
  /** Wall-clock instant remaining hits zero. Set only while running. */
  endsAt: number | null;
  status: TimerStatus;
  createdAt: number;
  muted: boolean;
  /** Wash used only while counting down. */
  runColor: TimerRunColor;
};

export type TimerDraft = {
  title: string;
  hours: number;
  minutes: number;
  seconds: number;
};

export const LAB_PRESETS = [
  { label: "0:30", ms: 30_000 },
  { label: "1:00", ms: 60_000 },
  { label: "3:00", ms: 180_000 },
  { label: "5:00", ms: 300_000 },
  { label: "10:00", ms: 600_000 },
  { label: "15:00", ms: 900_000 },
] as const;

export const ADD_CHIPS = [
  { label: "+0:30", ms: 30_000 },
  { label: "+1:00", ms: 60_000 },
  { label: "+5:00", ms: 300_000 },
] as const;

export const MAX_TIMER_MS = 99 * 60 * 60 * 1000;
export const DEFAULT_DRAFT_MS = 60_000;
