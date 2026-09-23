import { Grid3x3, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCounter } from "@/features/counter/CounterProvider";
import { NUMPAD_ENTER } from "@/lib/keys";
import { cn } from "@/lib/utils";

const NUMPAD: { key: string; label: string; className?: string; hideHandset?: boolean }[] = [
  { key: "NumLock", label: "Num", hideHandset: true },
  { key: "/", label: "/" },
  { key: "*", label: "*" },
  { key: "-", label: "-" },
  { key: "7", label: "7" },
  { key: "8", label: "8" },
  { key: "9", label: "9" },
  { key: "+", label: "+", className: "numpad-plus", hideHandset: true },
  { key: "4", label: "4" },
  { key: "5", label: "5" },
  { key: "6", label: "6" },
  { key: "1", label: "1" },
  { key: "2", label: "2" },
  { key: "3", label: "3" },
  { key: NUMPAD_ENTER, label: "Enter", className: "numpad-enter", hideHandset: true },
  { key: "0", label: "0", className: "numpad-zero", hideHandset: true },
  { key: ".", label: ".", hideHandset: true },
];

const KEYBOARD = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

function KeyHint({ children }: { children: string }) {
  return (
    <kbd className="mx-0.5 inline-flex h-5 items-center rounded-sm border border-border bg-muted px-1.5 font-sans text-[0.7rem] font-semibold text-foreground">
      {children}
    </kbd>
  );
}

function KeyButton({
  keyValue,
  label,
  className,
  hideHandset,
}: {
  keyValue: string;
  label: string;
  className?: string;
  hideHandset?: boolean;
}) {
  const ctx = useCounter();
  const bound =
    ctx.view === "estimate"
      ? keyValue === ctx.estimate.fieldCountKey
        ? "field count"
        : ctx.estimate.cells.find((c) => c.key === keyValue)?.name
      : ctx.preset.rows.find((r) => r.key === keyValue)?.cell;
  const captureCurrentKey =
    !ctx.capture
      ? null
      : ctx.view === "estimate"
        ? ctx.capture.id === "field"
          ? ctx.estimate.fieldCountKey
          : (ctx.estimate.cells.find((c) => c.id === ctx.capture?.id)?.key ?? "")
        : (ctx.preset.rows.find((r) => r.id === ctx.capture?.id)?.key ?? "");
  const captureActive = Boolean(ctx.capture);
  const captureCurrent = captureCurrentKey === keyValue;
  const captureTaken = captureActive && Boolean(bound) && !captureCurrent;

  return (
    <button
      type="button"
      data-capture-zone
      aria-label={
        captureTaken ? `${label}, ${bound}, swap` : bound ? `${label}, ${bound}` : label
      }
      className={cn(
        "flex min-h-0 touch-manipulation select-none flex-col items-center justify-center rounded-md border border-border bg-background px-0.5 py-0.5 text-sm shadow-sm outline-none hover:bg-accent active:bg-accent cursor-pointer focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        ctx.isHandset && "min-h-21 px-1 py-2 text-lg",
        ctx.flashKey === keyValue &&
          (ctx.flashTick % 2 === 0 ? "flash-row-a" : "flash-row-b"),
        captureActive && !captureTaken && "border-ring/60 bg-(--timer-run-wash)",
        captureTaken && "bg-background text-muted-foreground",
        hideHandset && "hide-handset",
        className,
      )}
      onClick={() => {
        if (ctx.capture) {
          ctx.captureKey(keyValue);
          return;
        }
        if (ctx.view === "estimate") {
          if (keyValue === ctx.estimate.fieldCountKey) {
            ctx.bumpField(ctx.increase ? 1 : -1);
            return;
          }
          const cell = ctx.estimate.cells.find((c) => c.key === keyValue);
          if (cell) ctx.bumpEstimateCell(cell.id, ctx.increase ? 1 : -1);
          return;
        }
        const row = ctx.preset.rows.find((r) => r.key === keyValue);
        if (row) ctx.bumpRow(row.id, ctx.increase ? 1 : -1);
      }}
    >
      <span className="font-semibold leading-none tabular-nums">{label}</span>
      {bound ? (
        <span
          className={cn(
            "mt-1 max-w-full px-0.5 text-[10px] leading-none text-muted-foreground",
            ctx.isHandset
              ? "mt-1.5 line-clamp-2 text-center text-xs leading-tight"
              : "truncate",
          )}
        >
          {bound}
        </span>
      ) : null}
    </button>
  );
}

export function KeyboardLayoutToggle() {
  const ctx = useCounter();
  const layout = ctx.keyboardType === "keyboard" ? "keyboard" : "numpad";

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="inline-flex h-9 shrink-0 items-center rounded-md border border-border p-0.5"
        role="group"
        aria-label="On-screen layout"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Keypad"
              aria-pressed={layout === "numpad"}
              className={cn("size-8", layout === "numpad" && "bg-accent text-accent-foreground")}
              onClick={() => ctx.setKeyboardType("numpad")}
            >
              <Grid3x3 />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Keypad</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Keyboard"
              aria-pressed={layout === "keyboard"}
              className={cn("size-8", layout === "keyboard" && "bg-accent text-accent-foreground")}
              onClick={() => ctx.setKeyboardType("keyboard")}
            >
              <Keyboard />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Keyboard</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function Keypad() {
  const ctx = useCounter();
  const layout = ctx.isHandset || ctx.keyboardType === "numpad" ? "numpad" : "keyboard";
  const captureTarget = ctx.captureLabel ?? "cell";
  const bindingHint =
    ctx.captureNotice ??
    (ctx.capture
      ? `Binding ${captureTarget}...`
      : "Undo: Backspace or Ctrl+Z (when not typing in an input).");

  return (
    <div className="relative">
      {ctx.capture ? (
        <>
          <button
            type="button"
            aria-label="Cancel key binding"
            className="fixed inset-0 z-50 cursor-pointer bg-black/50"
            onClick={ctx.cancelCapture}
          />
          <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center px-4 pt-18 sm:px-6 sm:pt-22">
          <div
            data-capture-zone
            className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-popover p-4 shadow-lg"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Key Binding Mode
            </p>
            <p className="mt-1 text-base text-foreground">
              Press any key for <span className="font-semibold text-primary">{captureTarget}</span>.
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Use your keyboard or tap a key on the keypad. <KeyHint>Esc</KeyHint> cancels.{" "}
              <KeyHint>Delete</KeyHint> or <KeyHint>Backspace</KeyHint> clears this binding.
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-capture-zone
                className="h-7 px-3 text-xs"
                onClick={ctx.cancelCapture}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-capture-zone
                className="h-7 px-3 text-xs"
                onClick={() => ctx.captureKey("")}
              >
                Unbind
              </Button>
            </div>
          </div>
          </div>
        </>
      ) : null}
      <div className={cn(ctx.capture && "relative z-[55]")}>
      <div className="mb-2 min-h-4 text-xs text-muted-foreground" aria-live="polite">
        <span>{bindingHint}</span>
      </div>
      {layout === "numpad" ? (
        <div
          data-capture-zone
          className={cn("numpad-grid", ctx.isHandset && "numpad-handset")}
        >
          {(ctx.isHandset ? NUMPAD.filter((k) => !k.hideHandset) : NUMPAD).map((k) => (
            <KeyButton
              key={k.key}
              keyValue={k.key}
              label={k.label}
              className={k.className}
              hideHandset={k.hideHandset}
            />
          ))}
        </div>
      ) : (
        <div data-capture-zone className="keyboard-board">
          {KEYBOARD.map((row, i) => (
            <div key={i} className="keyboard-row" data-row={i}>
              {row.map((k) => (
                <KeyButton key={k} keyValue={k} label={k} className="keyboard-key" />
              ))}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
