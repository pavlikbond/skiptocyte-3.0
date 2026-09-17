import { useCallback, useEffect, useRef, useState } from "react";
import { startDoneChime, stopDoneChime, unlockTimerAudio } from "./timerChime";
import {
  addTime as addTimeLogic,
  anyLoudDone,
  createTimer,
  muteAll,
  pauseTimer,
  renameTimer,
  resetTimer,
  resumeTimer,
  setRemaining as applyRemaining,
  setRunColor as applyRunColor,
  setTimerMuted,
  settleAll,
} from "./timerLogic";
import { loadTimerMute, loadTimers, saveTimerMute, saveTimers } from "./timerStorage";
import type { BenchTimer, TimerRunColor } from "./types";

const PAGE_TITLE = "Skiptocyte: Laboratory Tools";

function hydrateTimers(): BenchTimer[] {
  return settleAll(loadTimers(), Date.now()).timers;
}

export function useTimers() {
  const [timers, setTimers] = useState<BenchTimer[]>(hydrateTimers);
  const [muted, setMuted] = useState(() => loadTimerMute());
  const [now, setNow] = useState(() => Date.now());
  const [alarm, setAlarm] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const running = timers.some((t) => t.status === "running");
  const anyDone = timers.some((t) => t.status === "done");
  const loudDone = anyLoudDone(timers);

  const applySettle = useCallback((list: BenchTimer[], at: number) => {
    const result = settleAll(list, at);
    if (result.finished.length) {
      setAlarm(true);
      const chime = result.finished.some((id) => {
        const timer = result.timers.find((item) => item.id === id);
        return timer != null && !timer.muted;
      });
      if (chime) {
        void unlockTimerAudio().then(() => startDoneChime(false));
      }
    }
    return result.changed ? result.timers : list;
  }, []);

  useEffect(() => {
    saveTimers(timers);
  }, [timers]);

  useEffect(() => {
    saveTimerMute(muted);
  }, [muted]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      setTimers((list) => applySettle(list, at));
    }, 200);
    return () => window.clearInterval(id);
  }, [running, applySettle]);

  useEffect(() => {
    const onVis = () => {
      const at = Date.now();
      setNow(at);
      setTimers((list) => applySettle(list, at));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [applySettle]);

  useEffect(() => {
    if (!anyDone) setAlarm(false);
  }, [anyDone]);

  useEffect(() => {
    if (alarm && loudDone) startDoneChime(false);
    else stopDoneChime();
    return () => stopDoneChime();
  }, [alarm, loudDone]);

  useEffect(() => {
    const done = timers.filter((t) => t.status === "done");
    if (done.length === 0) {
      document.title = PAGE_TITLE;
      return;
    }
    const label = done[0].title.trim() || "Timer";
    document.title =
      done.length === 1 ? `${label} is done — Skiptocyte` : `${done.length} timers done — Skiptocyte`;
    return () => {
      document.title = PAGE_TITLE;
    };
  }, [timers]);

  const start = useCallback((title: string, durationMs: number) => {
    void unlockTimerAudio();
    const t = Date.now();
    setNow(t);
    const created = createTimer(title, durationMs, t, mutedRef.current);
    if (!created) return false;
    setTimers((list) => [created, ...list]);
    return true;
  }, []);

  const pause = useCallback((id: string) => {
    const t = Date.now();
    setNow(t);
    setTimers((list) => list.map((item) => (item.id === id ? pauseTimer(item, t) : item)));
  }, []);

  const resume = useCallback((id: string) => {
    void unlockTimerAudio();
    const t = Date.now();
    setNow(t);
    setTimers((list) => list.map((item) => (item.id === id ? resumeTimer(item, t) : item)));
  }, []);

  const reset = useCallback((id: string) => {
    setNow(Date.now());
    setTimers((list) => {
      const next = list.map((item) => (item.id === id ? resetTimer(item) : item));
      if (!anyLoudDone(next)) stopDoneChime();
      return next;
    });
  }, []);

  const add = useCallback((id: string, ms: number) => {
    void unlockTimerAudio();
    const t = Date.now();
    setNow(t);
    setTimers((list) => list.map((item) => (item.id === id ? addTimeLogic(item, ms, t) : item)));
  }, []);

  const rename = useCallback((id: string, title: string) => {
    setTimers((list) => list.map((item) => (item.id === id ? renameTimer(item, title) : item)));
  }, []);

  const setRemaining = useCallback((id: string, remainingMs: number) => {
    setTimers((list) => list.map((item) => (item.id === id ? applyRemaining(item, remainingMs) : item)));
  }, []);

  const remove = useCallback((id: string) => {
    setTimers((list) => list.filter((item) => item.id !== id));
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      setTimers((list) => muteAll(list, next));
      if (next) stopDoneChime();
      else void unlockTimerAudio();
      return next;
    });
  }, []);

  const toggleTimerMute = useCallback((id: string) => {
    void unlockTimerAudio();
    setTimers((list) =>
      list.map((item) => (item.id === id ? setTimerMuted(item, !item.muted) : item)),
    );
  }, []);

  const setRunColor = useCallback((id: string, runColor: TimerRunColor) => {
    setTimers((list) => list.map((item) => (item.id === id ? applyRunColor(item, runColor) : item)));
  }, []);

  return {
    timers,
    now,
    muted,
    start,
    pause,
    resume,
    reset,
    add,
    rename,
    remove,
    toggleMute,
    toggleTimerMute,
    setRunColor,
    setRemaining,
  };
}
