import { useRef } from "react";
import { Grid3x3, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCounterSession } from "@/features/counter/context/useCounterSession";
import { keyLabel, NUMPAD_ENTER } from "@/lib/keys";
import { cn } from "@/lib/utils";

type PadKey = { key: string; label: string; className?: string; hideHandset?: boolean };

const NUMPAD: PadKey[] = [
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

const HANDSET_NUMPAD_KEYS = ["/", "*", "-", "7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ".", "+"];
const NUMPAD_BY_KEY = new Map(NUMPAD.map((item) => [item.key, item]));
const HANDSET_NUMPAD: PadKey[] = HANDSET_NUMPAD_KEYS.map((key) => {
  const item = NUMPAD_BY_KEY.get(key);
  if (!item) throw new Error(`Missing keypad key: ${key}`);
  // Handset uses a uniform 3-column grid, so skip desktop span classes.
  return { key: item.key, label: item.label };
});
const KEYBOARD = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];
const MOBILE_BINDING_KEYS = HANDSET_NUMPAD_KEYS;
// A touch tap also synthesizes a click. Ignore that click so a key is counted once.
const TOUCH_CLICK_SUPPRESS_MS = 700;

function pointInsideRect(x: number, y: number, rect: DOMRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

type BindingSession = ReturnType<typeof useCounterSession>;

/** Cell or field that already owns this key, or null when the key is free. */
function boundLabel(ctx: BindingSession, keyValue: string): string | null {
  if (!keyValue) return null;
  if (ctx.view === "estimate") {
    if (keyValue === ctx.estimate.fieldCountKey) return "field count";
    const cell = ctx.estimate.cells.find((item) => item.key === keyValue);
    return cell ? cell.name.trim() || "Unnamed" : null;
  }
  const row = ctx.preset.rows.find((item) => item.key === keyValue);
  return row ? row.cell.trim() || "Unnamed" : null;
}

function KeyHint({ children }: { children: string }) {
  return (
    <kbd className="mx-0.5 inline-flex h-5 items-center rounded-sm border border-border bg-muted px-1.5 font-sans text-[0.7rem] font-semibold text-foreground">
      {children}
    </kbd>
  );
}

function BindingKeyButton({ keyValue, currentKey }: { keyValue: string; currentKey: string }) {
  const ctx = useCounterSession();
  const owner = boundLabel(ctx, keyValue);
  const current = currentKey === keyValue;
  const taken = Boolean(owner) && !current;
  const label = keyLabel(keyValue);
  const caption = current ? "Current" : taken ? owner : "—";

  return (
    <button
      type="button"
      data-capture-zone
      data-howto="bind-key"
      data-key={keyValue}
      title={current ? "Current binding" : taken ? `${owner}. Tap to swap.` : "Available"}
      aria-label={
        current
          ? `Bind ${label}, current binding`
          : taken
            ? `Bind ${label}, taken by ${owner}`
            : `Bind ${label}, available`
      }
      aria-pressed={current}
      className={cn(
        "flex h-14 min-w-0 touch-manipulation cursor-pointer select-none flex-col items-center justify-center rounded-md border px-1 outline-none",
        "hover:bg-accent active:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        current && "border-ring bg-accent text-accent-foreground ring-2 ring-ring/50",
        taken && "border-border border-b-2 bg-card text-foreground",
        !current && !taken && "border-dashed border-border bg-transparent text-foreground",
      )}
      onClick={() => ctx.captureKey(keyValue)}
    >
      <span className="text-sm font-semibold leading-none tabular-nums">{label}</span>
      <span
        className={cn(
          "mt-0.5 line-clamp-2 w-full px-0.5 text-center text-[11px] leading-tight",
          current ? "font-medium text-accent-foreground" : taken ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {caption}
      </span>
    </button>
  );
}

function KeyButton({
  keyValue,
  label,
  className,
  hideHandset,
  handsetLike,
  fill,
}: {
  keyValue: string;
  label: string;
  className?: string;
  hideHandset?: boolean;
  handsetLike?: boolean;
  fill?: boolean;
}) {
  const ctx = useCounterSession();
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
  const pressed = useRef(false);
  const touchGestureAt = useRef(0);
  const lastPoint = useRef({ x: 0, y: 0 });

  const activate = () => {
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
  };

  return (
    <button
      type="button"
      data-capture-zone
      data-howto="pad-key"
      data-key={keyValue}
      aria-label={
        captureTaken ? `${label}, ${bound}, swap` : bound ? `${label}, ${bound}` : label
      }
      className={cn(
        "flex min-h-0 select-none flex-col items-center justify-center rounded-md border border-border bg-background px-0.5 py-0.5 text-sm shadow-sm outline-none hover:bg-accent active:bg-accent cursor-pointer focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // Keep the pointer alive through a small slide so pointerup can count it.
        fill ? "touch-none" : "touch-manipulation",
        handsetLike && !fill && "min-h-21 px-1 py-2 text-lg",
        fill && "h-full w-full min-h-0 px-1 py-1 text-lg",
        ctx.flashKey === keyValue &&
          (ctx.flashTick % 2 === 0 ? "flash-row-a" : "flash-row-b"),
        captureActive && !captureTaken && "border-ring/60 bg-(--timer-run-wash)",
        captureTaken && "bg-background text-muted-foreground",
        hideHandset && "hide-handset",
        className,
      )}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        pressed.current = true;
        touchGestureAt.current = Date.now();
        lastPoint.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        if (!pressed.current || event.pointerType === "mouse") return;
        if (event.clientX === 0 && event.clientY === 0) return;
        lastPoint.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "mouse") return;
        const startedHere = pressed.current;
        pressed.current = false;
        if (!startedHere) return;
        touchGestureAt.current = Date.now();
        event.preventDefault();
        // Some phones report 0,0 for pointerup. The last real point is still inside this key
        // for a twitch, and outside it once the finger has crossed a gap.
        const point =
          event.clientX === 0 && event.clientY === 0
            ? lastPoint.current
            : { x: event.clientX, y: event.clientY };
        if (!pointInsideRect(point.x, point.y, event.currentTarget.getBoundingClientRect())) return;
        activate();
      }}
      onPointerCancel={() => {
        pressed.current = false;
      }}
      onClick={() => {
        // Touch already counted on pointerup. This swallows the extra click, including one
        // the browser still emits after a slide that stays inside the key.
        if (Date.now() - touchGestureAt.current < TOUCH_CLICK_SUPPRESS_MS) return;
        activate();
      }}
    >
      <span className="font-semibold leading-none tabular-nums">{label}</span>
      {bound ? (
        <span
          className={cn(
            "mt-1 max-w-full px-0.5 text-[10px] leading-none text-muted-foreground",
            handsetLike
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
  const ctx = useCounterSession();
  const layout = ctx.keyboardType === "keyboard" ? "keyboard" : "numpad";

  return (
    <TooltipProvider delayDuration={200}>
      <div
        data-howto="layout"
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

export function Keypad({ className, fullscreenPad = false }: { className?: string; fullscreenPad?: boolean }) {
  const ctx = useCounterSession();
  const handsetLike = ctx.isHandset || fullscreenPad;
  const layout = handsetLike || ctx.keyboardType === "numpad" ? "numpad" : "keyboard";
  const captureTarget = ctx.captureLabel ?? "cell";
  const captureCurrentKey = !ctx.capture
    ? ""
    : ctx.view === "estimate"
      ? ctx.capture.id === "field"
        ? ctx.estimate.fieldCountKey
        : (ctx.estimate.cells.find((c) => c.id === ctx.capture?.id)?.key ?? "")
      : (ctx.preset.rows.find((r) => r.id === ctx.capture?.id)?.key ?? "");
  const bindingHint =
    ctx.captureNotice ??
    (ctx.capture
      ? `Binding ${captureTarget}...`
      : handsetLike
        ? ""
        : "Undo: Backspace or Ctrl+Z.");
  const showBindingHint = Boolean(bindingHint);

  return (
    <div className={cn("relative flex min-h-0 flex-col", className)}>
      {ctx.capture ? (
        <>
          <button
            type="button"
            aria-label="Cancel key binding"
            className="fixed inset-0 z-50 cursor-pointer bg-black/50"
            onClick={ctx.cancelCapture}
          />
          <div className="pointer-events-none fixed inset-0 z-60 flex items-start justify-center px-4 pt-18 sm:px-6 sm:pt-22">
          <div
            data-capture-zone
            className="pointer-events-auto max-h-[calc(100dvh-5rem)] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-popover p-4 shadow-lg"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Key Binding Mode
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Current binding:{" "}
              <span className="font-semibold text-foreground">
                {captureCurrentKey ? keyLabel(captureCurrentKey) : "Unbound"}
              </span>
            </p>
            <p className="mt-1 text-base text-foreground">
              Press any key for <span className="font-semibold text-primary">{captureTarget}</span>.
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {ctx.isHandset
                ? "Tap a key below to bind it."
                : handsetLike
                ? "Tap a key below to bind it."
                : "Use your keyboard or tap a key on the keypad."}
              {!handsetLike ? (
                <>
                  {" "}
                  <KeyHint>Esc</KeyHint> cancels. <KeyHint>Delete</KeyHint> or{" "}
                  <KeyHint>Backspace</KeyHint> clears this binding.
                </>
              ) : null}
            </p>
            {handsetLike ? (
              <div className="mt-3 rounded-md border border-border bg-background p-2">
                <p className="text-xs font-medium text-muted-foreground">Tap to bind keypad key</p>
                <p className="mt-0.5 mb-2 text-[11px] leading-snug text-muted-foreground">
                  Dashed keys are free. Tap a named key to swap.
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {MOBILE_BINDING_KEYS.map((k) => (
                    <BindingKeyButton key={k} keyValue={k} currentKey={captureCurrentKey} />
                  ))}
                </div>
              </div>
            ) : null}
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
      <div className={cn("flex min-h-0 flex-1 flex-col", ctx.capture && "relative z-55")}>
      {showBindingHint ? (
        <div className="mb-2 min-h-4 text-xs text-muted-foreground" aria-live="polite">
          <span>{bindingHint}</span>
        </div>
      ) : null}
      {layout === "numpad" ? (
        <div
          data-capture-zone
          data-howto="pad"
          className={cn("numpad-grid", "flex-1", handsetLike && "numpad-handset")}
        >
          {(handsetLike ? HANDSET_NUMPAD : NUMPAD).map((k) => (
            <KeyButton
              key={k.key}
              keyValue={k.key}
              label={k.label}
              className={k.className}
              hideHandset={k.hideHandset}
              handsetLike={handsetLike}
              fill={fullscreenPad}
            />
          ))}
        </div>
      ) : (
        <div data-capture-zone data-howto="pad" className="keyboard-board">
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
