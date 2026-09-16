import { useRef, useState, type FormEvent, type RefObject } from "react";
import { LAB_PRESETS } from "./types";
import { draftToMs, emptyDraft, formatTimer, msToDraft } from "./timerLogic";

type Props = {
  onStart: (title: string, durationMs: number) => boolean;
};

export function TimerComposer({ onStart }: Props) {
  const [draft, setDraft] = useState(emptyDraft);
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);
  const durationMs = draftToMs(draft);
  const canStart = durationMs > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canStart) return;
    const ok = onStart(draft.title, durationMs);
    if (ok) setDraft((d) => ({ ...d, title: "" }));
  };

  const startPreset = (ms: number) => {
    onStart(draft.title, ms);
    setDraft((d) => ({ ...d, title: "", ...msToDraft(ms) }));
  };

  return (
    <form className="timer-composer" onSubmit={submit}>
      <div className="timer-composer-head">
        <label htmlFor="new-timer-note" className="sr-only">
          Note for new timer
        </label>
        <input
          id="new-timer-note"
          className="timer-title"
          value={draft.title}
          placeholder="Note — Wright stain, incubation…"
          maxLength={80}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
      </div>

      <div className="timer-draft-time">
        <TimeUnit
          id="timer-hours"
          label="hr"
          accessibleName="Hours"
          value={draft.hours}
          max={99}
          nextRef={minutesRef}
          onChange={(hours) => setDraft((d) => ({ ...d, hours }))}
        />
        <span className="timer-colon" aria-hidden="true">
          :
        </span>
        <TimeUnit
          id="timer-minutes"
          label="min"
          accessibleName="Minutes"
          value={draft.minutes}
          max={59}
          inputRef={minutesRef}
          nextRef={secondsRef}
          onChange={(minutes) => setDraft((d) => ({ ...d, minutes }))}
        />
        <span className="timer-colon" aria-hidden="true">
          :
        </span>
        <TimeUnit
          id="timer-seconds"
          label="sec"
          accessibleName="Seconds"
          value={draft.seconds}
          max={59}
          inputRef={secondsRef}
          onChange={(seconds) => setDraft((d) => ({ ...d, seconds }))}
        />
      </div>
      <p className="sr-only">Duration {formatTimer(durationMs)}</p>

      <div className="timer-presets">
        {LAB_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="timer-chip"
            onClick={() => startPreset(preset.ms)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <button type="submit" className="timer-start" disabled={!canStart}>
        Start
      </button>
    </form>
  );
}

function TimeUnit({
  id,
  label,
  accessibleName,
  value,
  max,
  inputRef,
  nextRef,
  onChange,
}: {
  id: string;
  label: string;
  accessibleName: string;
  value: number;
  max: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  nextRef?: RefObject<HTMLInputElement | null>;
  onChange: (n: number) => void;
}) {
  return (
    <div className="timer-unit">
      <label className="sr-only" htmlFor={id}>
        {accessibleName}
      </label>
      <input
        ref={inputRef}
        id={id}
        className="timer-digit"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        value={String(value).padStart(2, "0")}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(-2);
          const parsed = Number(digits || 0);
          const n = Math.min(max, Number.isFinite(parsed) ? parsed : 0);
          onChange(n);
          if (digits.length >= 2 && nextRef?.current) {
            nextRef.current.focus();
            nextRef.current.select();
          }
        }}
      />
      <span className="timer-unit-label" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}
