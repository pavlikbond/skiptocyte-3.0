import { Grid3x3, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCounter } from "@/features/counter/CounterProvider";
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
  { key: "Enter", label: "Enter", className: "numpad-enter", hideHandset: true },
  { key: "0", label: "0", className: "numpad-zero", hideHandset: true },
  { key: ".", label: ".", hideHandset: true },
];

const KEYBOARD = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
];

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

  return (
    <button
      type="button"
      aria-label={bound ? `${label}, ${bound}` : label}
      className={cn(
        "flex min-h-0 touch-manipulation select-none flex-col items-center justify-center rounded-md border border-border bg-background px-0.5 py-0.5 text-sm shadow-sm outline-none hover:bg-accent active:bg-accent cursor-pointer focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        ctx.isHandset && "min-h-21 px-1 py-2 text-lg",
        ctx.flashKey === keyValue &&
          (ctx.flashTick % 2 === 0 ? "flash-row-a" : "flash-row-b"),
        hideHandset && "hide-handset",
        className,
      )}
      onClick={() => {
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

  return (
    <div>
      {layout === "numpad" ? (
        <div className={cn("numpad-grid", ctx.isHandset && "numpad-handset")}>
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
        <div className="keyboard-board">
          {KEYBOARD.map((row, i) => (
            <div key={i} className="keyboard-row" data-row={i}>
              {row.map((k) => (
                <KeyButton key={k} keyValue={k} label={k} className="keyboard-key" />
              ))}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Undo: Backspace or Ctrl+Z (when not typing in an input).
      </p>
    </div>
  );
}
