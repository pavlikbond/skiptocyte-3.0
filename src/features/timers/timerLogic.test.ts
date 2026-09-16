import { describe, expect, it } from "vitest";
import {
  addTime,
  createTimer,
  draftToMs,
  formatTimer,
  msToDraft,
  muteAll,
  liveRemaining,
  liveStatus,
  pauseTimer,
  resetTimer,
  resumeTimer,
  ringProgress,
  setRunColor,
  settleAll,
} from "./timerLogic";
import { coerceRunColor } from "./types";
import type { BenchTimer } from "./types";

function timer(partial: Partial<BenchTimer> & Pick<BenchTimer, "status">): BenchTimer {
  return {
    id: "t1",
    title: "Wright stain",
    initialMs: 60_000,
    durationMs: 60_000,
    remainingMs: 60_000,
    endsAt: null,
    createdAt: 1_000,
    muted: false,
    runColor: "blue",
    ...partial,
  };
}

describe("draft and format", () => {
  it("turns hours, minutes and seconds into milliseconds", () => {
    expect(draftToMs({ hours: 0, minutes: 5, seconds: 0 })).toBe(300_000);
    expect(draftToMs({ hours: 0, minutes: 0, seconds: 30 })).toBe(30_000);
    expect(draftToMs({ hours: 0, minutes: 1, seconds: 90 })).toBe(119_000);
    expect(draftToMs({ hours: 1, minutes: 1, seconds: 1 })).toBe(3_661_000);
    expect(draftToMs({ hours: 0, minutes: 90, seconds: 0 })).toBe(59 * 60_000);
  });

  it("splits milliseconds back into hours, minutes and seconds", () => {
    expect(msToDraft(60_000)).toEqual({ hours: 0, minutes: 1, seconds: 0 });
    expect(msToDraft(3_661_000)).toEqual({ hours: 1, minutes: 1, seconds: 1 });
  });

  it("formats like the Google readout", () => {
    expect(formatTimer(52_000)).toBe("0:52");
    expect(formatTimer(292_000)).toBe("4:52");
    expect(formatTimer(3_661_000)).toBe("1:01:01");
  });
});

describe("running remaining", () => {
  it("counts down from endsAt", () => {
    const t = timer({ status: "running", endsAt: 10_000, remainingMs: 5_000 });
    expect(liveRemaining(t, 7_000)).toBe(3_000);
    expect(liveStatus(t, 7_000)).toBe("running");
  });

  it("flips to done when time runs out", () => {
    const t = timer({ status: "running", endsAt: 10_000 });
    expect(liveRemaining(t, 10_000)).toBe(0);
    expect(liveStatus(t, 10_500)).toBe("done");
  });
});

describe("controls", () => {
  it("creates a running timer", () => {
    const t = createTimer("Incubate", 180_000, 5_000);
    expect(t).not.toBeNull();
    expect(t?.status).toBe("running");
    expect(t?.endsAt).toBe(185_000);
    expect(t?.title).toBe("Incubate");
    expect(t?.runColor).toBe("blue");
  });

  it("keeps a running color without changing status", () => {
    const t = timer({ status: "paused" });
    const next = setRunColor(t, "rose");
    expect(next.runColor).toBe("rose");
    expect(next.status).toBe("paused");
    expect(coerceRunColor("nope")).toBe("blue");
  });

  it("refuses a zero duration", () => {
    expect(createTimer("Nope", 0, 0)).toBeNull();
  });

  it("pauses a running timer at the remaining instant", () => {
    const t = timer({ status: "running", endsAt: 20_000 });
    const paused = pauseTimer(t, 12_000);
    expect(paused.status).toBe("paused");
    expect(paused.remainingMs).toBe(8_000);
    expect(paused.endsAt).toBeNull();
  });

  it("resumes from paused remaining", () => {
    const t = timer({ status: "paused", remainingMs: 15_000 });
    const running = resumeTimer(t, 40_000);
    expect(running.status).toBe("running");
    expect(running.endsAt).toBe(55_000);
  });

  it("restarts a done timer from the original duration", () => {
    const t = timer({ status: "done", remainingMs: 0, durationMs: 90_000, initialMs: 60_000 });
    const running = resumeTimer(t, 8_000);
    expect(running.status).toBe("running");
    expect(running.remainingMs).toBe(60_000);
    expect(running.endsAt).toBe(68_000);
  });

  it("reset restores the original duration and pauses", () => {
    const t = timer({
      status: "running",
      durationMs: 90_000,
      initialMs: 60_000,
      endsAt: 50_000,
    });
    const reset = resetTimer(t);
    expect(reset.status).toBe("paused");
    expect(reset.durationMs).toBe(60_000);
    expect(reset.remainingMs).toBe(60_000);
  });

  it("adds time while running without dropping below the current remainder", () => {
    const t = timer({ status: "running", durationMs: 60_000, endsAt: 30_000 });
    const next = addTime(t, 30_000, 10_000);
    expect(next.status).toBe("running");
    expect(liveRemaining(next, 10_000)).toBe(50_000);
    expect(next.durationMs).toBe(90_000);
  });

  it("adds time to a done timer and starts it", () => {
    const t = timer({ status: "done", remainingMs: 0 });
    const next = addTime(t, 30_000, 100);
    expect(next.status).toBe("running");
    expect(liveRemaining(next, 100)).toBe(30_000);
  });
});

describe("settle", () => {
  it("marks expired running timers done and reports them", () => {
    const running = timer({ id: "a", status: "running", endsAt: 5_000 });
    const paused = timer({ id: "b", status: "paused", remainingMs: 9_000 });
    const { timers, finished } = settleAll([running, paused], 6_000);
    expect(finished).toEqual(["a"]);
    expect(timers[0].status).toBe("done");
    expect(timers[1].status).toBe("paused");
  });

  it("ring progress is remaining over current duration", () => {
    const t = timer({ status: "paused", remainingMs: 15_000, durationMs: 60_000 });
    expect(ringProgress(t, 0)).toBe(0.25);
  });
});

describe("mute", () => {
  it("global mute stamps every timer", () => {
    const a = timer({ id: "a", status: "paused", muted: false });
    const b = timer({ id: "b", status: "running", muted: false });
    const muted = muteAll([a, b], true);
    expect(muted.every((t) => t.muted)).toBe(true);
    expect(muteAll(muted, false).every((t) => t.muted)).toBe(false);
  });
});
