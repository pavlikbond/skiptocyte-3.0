import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RUN_COLORS, RUN_COLOR_LABELS, type TimerRunColor } from "./types";

type Props = {
  value: TimerRunColor;
  label: string;
  onChange: (color: TimerRunColor) => void;
};

export function TimerColorPicker({ value, label, onChange }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="timer-color-trigger"
          aria-label={`Running color for ${label}: ${RUN_COLOR_LABELS[value]}`}
        >
          <span className="timer-swatch" data-run={value} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="timer-color-menu min-w-0 p-1.5">
        {RUN_COLORS.map((color) => (
          <DropdownMenuItem
            key={color}
            className="timer-color-choice size-[1.7rem] justify-center p-0"
            aria-label={RUN_COLOR_LABELS[color]}
            onSelect={() => onChange(color)}
          >
            <span className="timer-swatch" data-run={color} data-selected={color === value || undefined} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
