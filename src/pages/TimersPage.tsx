import { Volume2, VolumeX } from "lucide-react";
import { TimerCard } from "@/features/timers/TimerCard";
import { TimerComposer } from "@/features/timers/TimerComposer";
import { useTimers } from "@/features/timers/useTimers";

export function TimersPage() {
  const {
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
  } = useTimers();

  return (
    <div className="timer-page">
      <header className="timer-page-head">
        <div>
          <h1>Timers</h1>
          <p>
            Several waits can run at once — stain, incubate, rinse. Each ring keeps its own note.
          </p>
        </div>
        <button
          type="button"
          className="timer-mute"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Unmute all timers" : "Mute all timers"}
        >
          {muted ? <VolumeX /> : <Volume2 />}
          <span>{muted ? "Muted" : "Chime on"}</span>
        </button>
      </header>

      <TimerComposer onStart={start} />

      {timers.length === 0 ? (
        <p className="timer-empty">No waits running. Set a time above or tap a stain preset.</p>
      ) : (
        <div className="timer-grid">
          {timers.map((timer) => (
            <TimerCard
              key={timer.id}
              timer={timer}
              now={now}
              onPause={() => pause(timer.id)}
              onResume={() => resume(timer.id)}
              onReset={() => reset(timer.id)}
              onAdd={(ms) => add(timer.id, ms)}
              onRename={(title) => rename(timer.id, title)}
              onRemove={() => remove(timer.id)}
              onMute={() => toggleTimerMute(timer.id)}
              onColor={(color) => setRunColor(timer.id, color)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
