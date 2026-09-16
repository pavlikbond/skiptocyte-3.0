import { coerceRunColor, type BenchTimer } from "./types";

const TIMERS_KEY = "benchTimers";
const MUTE_KEY = "timerMute";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isTimer(value: unknown): value is BenchTimer {
  if (!value || typeof value !== "object") return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.initialMs === "number" &&
    typeof t.durationMs === "number" &&
    typeof t.remainingMs === "number" &&
    (t.endsAt === null || typeof t.endsAt === "number") &&
    (t.status === "running" || t.status === "paused" || t.status === "done") &&
    typeof t.createdAt === "number"
  );
}

export function loadTimers(): BenchTimer[] {
  const stored = readJson<unknown>(TIMERS_KEY);
  if (!Array.isArray(stored)) return [];
  return stored.filter(isTimer).map((timer) => ({
    ...timer,
    muted: Boolean((timer as BenchTimer).muted),
    runColor: coerceRunColor((timer as BenchTimer).runColor),
  }));
}

export function saveTimers(timers: BenchTimer[]) {
  localStorage.setItem(TIMERS_KEY, JSON.stringify(timers));
}

export function loadTimerMute(): boolean {
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function saveTimerMute(muted: boolean) {
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}
