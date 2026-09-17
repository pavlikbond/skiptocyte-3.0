import { useState, type FormEvent } from "react";
import { TimeFields } from "./TimeFields";
import { LAB_PRESETS } from "./types";
import { draftToMs, emptyDraft, formatTimer, msToDraft } from "./timerLogic";

type Props = {
  onStart: (title: string, durationMs: number) => boolean;
};

export function TimerComposer({ onStart }: Props) {
  const [draft, setDraft] = useState(emptyDraft);
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

      <TimeFields
        idPrefix="new-timer"
        ms={durationMs}
        onChange={(ms) => setDraft((d) => ({ ...d, ...msToDraft(ms) }))}
      />
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
