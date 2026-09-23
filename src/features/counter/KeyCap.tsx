import { useEffect, useRef } from "react";
import { keyLabel } from "@/lib/keys";
import { cn } from "@/lib/utils";

type KeyCapProps = {
  value: string;
  name: string;
  capturing: boolean;
  error: boolean;
  onStart: () => void;
  onCancel: () => void;
  tourRowId?: string;
};

export function KeyCap({
  value,
  name,
  capturing,
  error,
  onStart,
  onCancel,
  tourRowId,
}: KeyCapProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const empty = value === "";

  useEffect(() => {
    if (!capturing) return;
    ref.current?.focus();
  }, [capturing]);

  return (
    <button
      ref={ref}
      type="button"
      data-capture-zone
      data-howto={tourRowId ? "keycap" : undefined}
      data-howto-row={tourRowId}
      aria-pressed={capturing}
      aria-label={
        capturing
          ? `Listening for a key for ${name}`
          : empty
            ? `Set key for ${name}`
            : `Key for ${name}: ${keyLabel(value)}`
      }
      className={cn(
        "mx-auto flex h-8 min-w-12 items-center justify-center rounded-md border px-2 text-sm font-semibold tabular-nums shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        empty
          ? "border-dashed border-border bg-transparent text-muted-foreground"
          : "border border-border border-b-2 bg-card text-foreground hover:bg-accent",
        capturing &&
          "border-ring bg-(--timer-run-wash) text-(--timer-run-ink) ring-[3px] ring-ring/50",
        error && "shake",
      )}
      onClick={() => (capturing ? onCancel() : onStart())}
    >
      {capturing ? (
        <span className="keycap-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : (
        keyLabel(value || "—")
      )}
    </button>
  );
}
