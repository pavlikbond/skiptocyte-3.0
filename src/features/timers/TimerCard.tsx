import { Pause, Play, RotateCcw, Square, Trash2, Volume2, VolumeX } from "lucide-react";
import { TimeFields } from "./TimeFields";
import { TimerColorPicker } from "./TimerColorPicker";
import { ADD_CHIPS } from "./types";
import { formatTimer, liveRemaining, liveStatus, ringProgress } from "./timerLogic";
import type { BenchTimer, TimerRunColor } from "./types";

const RING = 112;
const STROKE = 2;
const RADIUS = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

type Props = {
  timer: BenchTimer;
  now: number;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onAdd: (ms: number) => void;
  onRename: (title: string) => void;
  onRemove: () => void;
  onMute: () => void;
  onColor: (color: TimerRunColor) => void;
  onSetRemaining: (ms: number) => void;
};

export function TimerCard({
  timer,
  now,
  onPause,
  onResume,
  onReset,
  onAdd,
  onRename,
  onRemove,
  onMute,
  onColor,
  onSetRemaining,
}: Props) {
  const status = liveStatus(timer, now);
  const remaining = liveRemaining(timer, now);
  const progress = ringProgress(timer, now);
  const offset = CIRC * (1 - progress);
  const titleId = `timer-title-${timer.id}`;
  const timeId = `timer-time-${timer.id}`;
  const canEditTime = status === "paused";
  const canStart = remaining > 0;

  const primary =
    status === "running" ? (
      <button type="button" className="timer-pill" onClick={onPause} aria-label={`Pause ${label(timer)}`}>
        <Pause />
        Pause
      </button>
    ) : (
      <button
        type="button"
        className="timer-pill"
        onClick={onResume}
        disabled={status !== "done" && !canStart}
        aria-label={status === "done" ? `Restart ${label(timer)}` : `Resume ${label(timer)}`}
      >
        <Play />
        {status === "done" ? "Restart" : remaining >= timer.durationMs ? "Start" : "Resume"}
      </button>
    );

  return (
    <article
      className="timer-card"
      data-state={status}
      data-run={timer.runColor}
      aria-labelledby={`${titleId} ${timeId}`}
    >
      <div className="timer-card-head">
        <TimerColorPicker value={timer.runColor} label={label(timer)} onChange={onColor} />
        <label className="sr-only" htmlFor={titleId}>
          Timer note
        </label>
        <input
          id={titleId}
          className="timer-title"
          value={timer.title}
          placeholder="Note — Wright stain, incubation…"
          maxLength={80}
          onChange={(e) => onRename(e.target.value)}
        />
        <button
          type="button"
          className="timer-icon-btn"
          onClick={onMute}
          aria-pressed={timer.muted}
          aria-label={timer.muted ? `Unmute ${label(timer)}` : `Mute ${label(timer)}`}
        >
          {timer.muted ? <VolumeX /> : <Volume2 />}
        </button>
        <button type="button" className="timer-icon-btn" onClick={onRemove} aria-label={`Remove ${label(timer)}`}>
          <Trash2 />
        </button>
      </div>

      <div className="timer-ring-wrap">
        <svg
          className="timer-ring"
          width={RING}
          height={RING}
          viewBox={`0 0 ${RING} ${RING}`}
          aria-hidden="true"
        >
          <circle className="timer-track" cx={RING / 2} cy={RING / 2} r={RADIUS} />
          <circle
            className="timer-arc"
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </svg>
        {canEditTime ? (
          <div id={timeId} className="timer-readout-edit" aria-label={formatTimer(remaining)}>
            <TimeFields idPrefix={timeId} ms={remaining} onChange={onSetRemaining} compact />
          </div>
        ) : (
          <p
            id={timeId}
            className={remaining >= 3_600_000 ? "timer-readout timer-readout-long" : "timer-readout"}
            aria-live={status === "done" ? "assertive" : "off"}
          >
            {status === "done" ? "0:00" : formatTimer(remaining)}
          </p>
        )}
        {status === "done" ? <p className="timer-done-label">Done</p> : null}
      </div>

      <div className="timer-adds">
        {ADD_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className="timer-chip"
            onClick={() => onAdd(chip.ms)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="timer-actions">
        {primary}
        {status === "done" ? (
          <button type="button" className="timer-pill" onClick={onReset} aria-label={`Stop ${label(timer)}`}>
            <Square className="timer-stop-glyph" />
            Stop
          </button>
        ) : (
          <button type="button" className="timer-pill" onClick={onReset} aria-label={`Reset ${label(timer)}`}>
            <RotateCcw />
            Reset
          </button>
        )}
      </div>
    </article>
  );
}

function label(timer: BenchTimer) {
  return timer.title.trim() || "timer";
}
