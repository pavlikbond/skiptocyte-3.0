import { useRef, type RefObject } from "react";
import { draftToMs, msToDraft } from "./timerLogic";

type Props = {
  idPrefix: string;
  ms: number;
  onChange: (ms: number) => void;
  compact?: boolean;
};

export function TimeFields({ idPrefix, ms, onChange, compact = false }: Props) {
  const draft = msToDraft(ms);
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<typeof draft>) => onChange(draftToMs({ ...draft, ...patch }));

  return (
    <div className={compact ? "timer-draft-time timer-draft-time-ring" : "timer-draft-time"}>
      <TimeUnit
        id={`${idPrefix}-hours`}
        label="hr"
        accessibleName="Hours"
        value={draft.hours}
        max={99}
        nextRef={minutesRef}
        onChange={(hours) => set({ hours })}
      />
      <span className="timer-colon" aria-hidden="true">
        :
      </span>
      <TimeUnit
        id={`${idPrefix}-minutes`}
        label="min"
        accessibleName="Minutes"
        value={draft.minutes}
        max={59}
        inputRef={minutesRef}
        nextRef={secondsRef}
        onChange={(minutes) => set({ minutes })}
      />
      <span className="timer-colon" aria-hidden="true">
        :
      </span>
      <TimeUnit
        id={`${idPrefix}-seconds`}
        label="sec"
        accessibleName="Seconds"
        value={draft.seconds}
        max={59}
        inputRef={secondsRef}
        onChange={(seconds) => set({ seconds })}
      />
    </div>
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
