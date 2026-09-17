import { newId } from "@/lib/utils";
import {
  DEFAULT_DRAFT_MS,
  DEFAULT_RUN_COLOR,
  MAX_TIMER_MS,
  coerceRunColor,
  type BenchTimer,
  type TimerDraft,
  type TimerRunColor,
  type TimerStatus,
} from "./types";

export function clampMs(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.min(MAX_TIMER_MS, Math.round(ms));
}

export function draftToMs(draft: Pick<TimerDraft, "hours" | "minutes" | "seconds">) {
  const hours = Math.max(0, Math.min(99, Math.floor(draft.hours) || 0));
  const minutes = Math.max(0, Math.min(59, Math.floor(draft.minutes) || 0));
  const seconds = Math.max(0, Math.min(59, Math.floor(draft.seconds) || 0));
  return clampMs(hours * 3_600_000 + minutes * 60_000 + seconds * 1000);
}

export function msToDraft(ms: number): Pick<TimerDraft, "hours" | "minutes" | "seconds"> {
  const total = Math.floor(clampMs(ms) / 1000);
  const hours = Math.min(99, Math.floor(total / 3600));
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { hours, minutes, seconds };
}

export function formatTimer(ms: number) {
  const total = Math.max(0, Math.ceil(clampMs(ms) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

export function liveRemaining(timer: BenchTimer, now: number) {
  if (timer.status === "done") return 0;
  if (timer.status === "running" && timer.endsAt != null) {
    return clampMs(timer.endsAt - now);
  }
  return clampMs(timer.remainingMs);
}

export function liveStatus(timer: BenchTimer, now: number): TimerStatus {
  if (timer.status === "running" && liveRemaining(timer, now) <= 0) return "done";
  return timer.status;
}

export function ringProgress(timer: BenchTimer, now: number) {
  const duration = Math.max(1, timer.durationMs);
  return Math.min(1, liveRemaining(timer, now) / duration);
}

export function createTimer(
  title: string,
  durationMs: number,
  now: number,
  muted = false,
): BenchTimer | null {
  const ms = clampMs(durationMs);
  if (ms <= 0) return null;
  return {
    id: newId(),
    title: title.trim().slice(0, 80),
    initialMs: ms,
    durationMs: ms,
    remainingMs: ms,
    endsAt: now + ms,
    status: "running",
    createdAt: now,
    muted,
    runColor: DEFAULT_RUN_COLOR,
  };
}

export function setRunColor(timer: BenchTimer, runColor: TimerRunColor): BenchTimer {
  const next = coerceRunColor(runColor);
  if (timer.runColor === next) return timer;
  return { ...timer, runColor: next };
}

export function pauseTimer(timer: BenchTimer, now: number): BenchTimer {
  if (liveStatus(timer, now) === "done") {
    return { ...timer, status: "done", remainingMs: 0, endsAt: null };
  }
  if (timer.status !== "running") return timer;
  const remaining = liveRemaining(timer, now);
  if (remaining <= 0) {
    return { ...timer, status: "done", remainingMs: 0, endsAt: null };
  }
  return { ...timer, status: "paused", remainingMs: remaining, endsAt: null };
}

export function resumeTimer(timer: BenchTimer, now: number): BenchTimer {
  const status = liveStatus(timer, now);
  if (status === "done") {
    const ms = timer.initialMs > 0 ? timer.initialMs : timer.durationMs;
    if (ms <= 0) return { ...timer, status: "done", remainingMs: 0, endsAt: null };
    return {
      ...timer,
      durationMs: ms,
      remainingMs: ms,
      endsAt: now + ms,
      status: "running",
    };
  }
  if (timer.status === "running") return timer;
  const remaining = liveRemaining(timer, now);
  if (remaining <= 0) {
    return { ...timer, status: "done", remainingMs: 0, endsAt: null };
  }
  return { ...timer, status: "running", remainingMs: remaining, endsAt: now + remaining };
}

export function resetTimer(timer: BenchTimer): BenchTimer {
  const ms = timer.initialMs > 0 ? timer.initialMs : timer.durationMs;
  return {
    ...timer,
    durationMs: ms,
    remainingMs: ms,
    endsAt: null,
    status: "paused",
  };
}

/** Set remaining while paused (including after reset). Running and done stay locked. */
export function setRemaining(timer: BenchTimer, remainingMs: number): BenchTimer {
  if (timer.status !== "paused") return timer;
  const ms = clampMs(remainingMs);
  const fullWait = timer.remainingMs >= timer.durationMs;
  if (fullWait) {
    return {
      ...timer,
      remainingMs: ms,
      durationMs: ms,
      initialMs: ms > 0 ? ms : timer.initialMs,
      endsAt: null,
    };
  }
  const elapsed = Math.max(0, timer.durationMs - timer.remainingMs);
  const duration = clampMs(elapsed + ms);
  return {
    ...timer,
    remainingMs: ms,
    durationMs: duration > 0 ? duration : timer.durationMs,
    endsAt: null,
  };
}

export function addTime(timer: BenchTimer, addMs: number, now: number): BenchTimer {
  const extra = clampMs(addMs);
  if (extra <= 0) return timer;
  const status = liveStatus(timer, now);
  if (status === "done") {
    return {
      ...timer,
      durationMs: extra,
      remainingMs: extra,
      endsAt: now + extra,
      status: "running",
    };
  }
  const remaining = liveRemaining(timer, now) + extra;
  const duration = clampMs(timer.durationMs + extra);
  if (timer.status === "running") {
    return {
      ...timer,
      durationMs: duration,
      remainingMs: remaining,
      endsAt: now + remaining,
      status: "running",
    };
  }
  return {
    ...timer,
    durationMs: duration,
    remainingMs: remaining,
    endsAt: null,
    status: "paused",
  };
}

export function renameTimer(timer: BenchTimer, title: string): BenchTimer {
  return { ...timer, title: title.slice(0, 80) };
}

export function setTimerMuted(timer: BenchTimer, muted: boolean): BenchTimer {
  if (timer.muted === muted) return timer;
  return { ...timer, muted };
}

export function muteAll(timers: BenchTimer[], muted: boolean) {
  return timers.map((timer) => setTimerMuted(timer, muted));
}

export function anyLoudDone(timers: BenchTimer[]) {
  return timers.some((timer) => timer.status === "done" && !timer.muted);
}

export function settleTimer(timer: BenchTimer, now: number): BenchTimer {
  if (liveStatus(timer, now) !== "done") return timer;
  if (timer.status === "done" && timer.remainingMs === 0 && timer.endsAt == null) return timer;
  return { ...timer, status: "done", remainingMs: 0, endsAt: null };
}

export function settleAll(timers: BenchTimer[], now: number) {
  let changed = false;
  const finished: string[] = [];
  const next = timers.map((timer) => {
    const settled = settleTimer(timer, now);
    if (settled !== timer) {
      changed = true;
      if (timer.status === "running") finished.push(timer.id);
    }
    return settled;
  });
  return { timers: changed ? next : timers, finished, changed };
}

export const emptyDraft = (): TimerDraft => ({
  ...msToDraft(DEFAULT_DRAFT_MS),
  title: "",
});
