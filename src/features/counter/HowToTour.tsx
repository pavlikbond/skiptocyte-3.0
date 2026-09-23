import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useCounterPresets } from "@/features/counter/context/useCounterPresets";
import { useCounterSession } from "@/features/counter/context/useCounterSession";
import {
  HOW_TO_STEP_COUNT,
  STEP,
  countStepBody,
  howToAnchor,
  placeCoachCard,
  selectStepShouldFinish,
  tourRowId,
  type HowToAnchor,
  type HowToStep,
} from "@/features/counter/howToLogic";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Add a cell",
    body: "Add Cell puts a new row on this diff.",
  },
  {
    title: "Name the cell",
    body: "Type the cell you’re seeing. This is the row you’ll bind next.",
  },
  {
    title: "Set its key",
    body: "Click the key, then press the numpad or keyboard key you want. Esc cancels the binding.",
  },
  { title: "Count", body: "" },
  {
    title: "Take one back",
    body: "− subtracts the next time you press the key. Undo takes back the last count. Backspace or Ctrl+Z does the same.",
  },
  {
    title: "Count limit",
    body: "Set how many cells to count. 100 is the usual diff.",
  },
  {
    title: "Open presets",
    body: "Open presets to save this layout or switch to another one.",
  },
  {
    title: "Save a preset",
    body: "Save as preset keeps the cells and keys. Counts are not stored in the preset.",
  },
  {
    title: "Select a preset",
    body: "Select loads that layout. A count in progress asks before it clears.",
  },
];

type Spot = {
  cx: number;
  cy: number;
  r: number;
  cardLeft: number;
  cardTop: number;
  cardWidth: number;
  missing: boolean;
};

function padHasKey(key: string) {
  if (!key) return false;
  return (
    document.querySelector(`[data-howto="pad-key"][data-key="${CSS.escape(key)}"]`) instanceof
    HTMLElement
  );
}

function isOpenDialog(node: Element) {
  if (!(node instanceof HTMLElement)) return false;
  if (node.dataset.state === "closed" || node.getAttribute("aria-hidden") === "true") return false;
  return true;
}

function foreignDialogOpen(allowPreset: boolean) {
  return [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some((node) => {
    if (!isOpenDialog(node)) return false;
    if (node.hasAttribute("data-howto-card")) return false;
    if (allowPreset && node.hasAttribute("data-howto-preset")) return false;
    return true;
  });
}

function anchorSelector(anchor: HowToAnchor, rowId: string | null, key: string) {
  if (anchor === "cell-name" && rowId) {
    return `[data-howto="cell-name"][data-howto-row="${CSS.escape(rowId)}"]`;
  }
  if (anchor === "keycap" && rowId) {
    return `[data-howto="keycap"][data-howto-row="${CSS.escape(rowId)}"]`;
  }
  if (anchor === "pad-key") {
    return `[data-howto="pad-key"][data-key="${CSS.escape(key)}"]`;
  }
  return `[data-howto="${anchor}"]`;
}

function emphasizeKeyboard(text: string) {
  const parts = text.split("keyboard");
  if (parts.length === 1) return text;
  return parts.flatMap((part, index) =>
    index === 0
      ? [part]
      : [
          <span key={index} className="font-semibold text-foreground">
            keyboard
          </span>,
          part,
        ],
  );
}

function holeFor(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    r: Math.max(rect.width, rect.height) / 2 + 10,
  };
}

function focusableItems(card: HTMLElement, target: HTMLElement | null) {
  const items = [...card.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")].filter(
    (el) => !el.hasAttribute("disabled"),
  );
  if (target && !card.contains(target)) items.push(target);
  return items;
}

export function HowToTour({ onClose }: { onClose: () => void }) {
  const session = useCounterSession();
  const presets = useCounterPresets();
  const [step, setStep] = useState<HowToStep>(0);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [surface, setSurface] = useState("");
  const startIds = useRef<string[] | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const spotRef = useRef<Spot | null>(null);
  const onCloseRef = useRef(onClose);

  if (startIds.current === null) startIds.current = session.preset.rows.map((row) => row.id);
  onCloseRef.current = onClose;

  const hidden = Boolean(session.capture) || dialogOpen;
  const rowId = tourRowId(startIds.current, session.preset.rows);
  const row = session.preset.rows.find((item) => item.id === rowId) ?? null;
  const keyOnPad = padHasKey(row?.key ?? "");
  const anchor = howToAnchor({
    step,
    rowId,
    key: row?.key ?? "",
    keyOnPad,
    isHandset: session.isHandset,
    savePresetVisible: surface.includes("save-preset"),
    saveDialogVisible: surface.includes("save-dialog"),
    selectPresetVisible: surface.includes("select-preset"),
    switchDialogVisible: surface.includes("switch-dialog"),
  });
  const selector = anchorSelector(anchor, rowId, row?.key ?? "");

  const body =
    step === STEP.count
      ? countStepBody(row?.cell ?? "", row?.key ?? "", keyOnPad, session.isHandset)
      : step === STEP.name && !rowId
        ? "Add a cell first. Then type its name."
        : step === STEP.key && !rowId
          ? "Add a cell first. Then click its key and press the key you want."
          : anchor === "presets" && step === STEP.save
            ? "Open presets, then choose Save as preset."
            : anchor === "save-dialog"
              ? "Name this setup, then choose Save."
              : anchor === "save-preset" && step === STEP.select
                ? "Save a preset first. Then choose Select on a different layout."
                : anchor === "presets" && step === STEP.select
                  ? "Open presets, then choose Select on a different layout."
                  : anchor === "switch-dialog"
                    ? "Load setup starts a new count with that preset."
                    : STEPS[step].body;

  const presetsAtSaveForm = useRef<number | null>(null);
  const selectBaseline = useRef<string | null>(null);

  useEffect(() => {
    if (step !== STEP.select) {
      selectBaseline.current = null;
      return;
    }
    const result = selectStepShouldFinish(selectBaseline.current, session.setupSource);
    selectBaseline.current = result.baseline;
    if (result.finish) onCloseRef.current();
  }, [session.setupSource, step]);

  useEffect(() => {
    const open = new Set(surface.split(" ").filter(Boolean));
    if (step === STEP.presets && (open.has("preset") || open.has("save-preset"))) {
      setStep(STEP.save);
      return;
    }
    if (step !== STEP.save) {
      presetsAtSaveForm.current = null;
      return;
    }
    if (open.has("save-dialog")) {
      if (presetsAtSaveForm.current === null) presetsAtSaveForm.current = presets.presets.length;
      return;
    }
    const named = presetsAtSaveForm.current;
    const listOpen = open.has("preset") || open.has("save-preset");
    if (named !== null && presets.presets.length > named && listOpen) setStep(STEP.select);
  }, [presets.presets.length, step, surface]);

  useLayoutEffect(() => {
    const allowPreset = step >= STEP.presets;
    const check = () => {
      const open = [...document.querySelectorAll("[data-howto-preset], [data-howto='save-preset'], [data-howto='select-preset'], [data-howto='save-dialog'], [data-howto='switch-dialog']")]
        .filter(isOpenDialog)
        .map((node) => node.getAttribute("data-howto") ?? "preset");
      setSurface([...new Set(open)].sort().join(" "));
      setDialogOpen(foreignDialogOpen(allowPreset));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "data-state", "aria-hidden", "data-howto"],
    });
    return () => observer.disconnect();
  }, [step]);

  useLayoutEffect(() => {
    if (hidden) return;
    let frame = 0;
    let tween: { from: Spot; to: { cx: number; cy: number; r: number }; start: number } | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrolledFor = { current: "" };

    const commit = (hole: { cx: number; cy: number; r: number }, missing: boolean) => {
      const width = Math.min(352, window.innerWidth - 32);
      const height = cardRef.current?.offsetHeight ?? 188;
      const pos = placeCoachCard({
        hole: missing ? { cx: window.innerWidth / 2, cy: window.innerHeight / 2, r: 0 } : hole,
        card: { w: width, h: height },
        viewport: { w: window.innerWidth, h: window.innerHeight },
        handset: session.isHandset,
      });
      const next: Spot = { ...hole, cardLeft: pos.left, cardTop: pos.top, cardWidth: width, missing };
      spotRef.current = next;
      setSpot(next);
    };

    const measure = (animate: boolean) => {
      const el = document.querySelector(selector);
      const target = el instanceof HTMLElement ? el : null;
      targetRef.current = target;
      if (!target) {
        tween = null;
        commit({ cx: 0, cy: 0, r: 0 }, true);
        return;
      }
      if (scrolledFor.current !== selector) {
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
        scrolledFor.current = selector;
      }
      const next = holeFor(target);
      if (!animate || reduced || !spotRef.current || spotRef.current.missing) {
        tween = null;
        commit(next, false);
        return;
      }
      tween = {
        from: spotRef.current,
        to: next,
        start: performance.now(),
      };
      tick();
    };

    const tick = () => {
      if (!tween) return;
      const t = Math.min(1, (performance.now() - tween.start) / 220);
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      commit(
        {
          cx: tween.from.cx + (tween.to.cx - tween.from.cx) * eased,
          cy: tween.from.cy + (tween.to.cy - tween.from.cy) * eased,
          r: tween.from.r + (tween.to.r - tween.from.r) * eased,
        },
        false,
      );
      if (t < 1) frame = window.requestAnimationFrame(tick);
      else tween = null;
    };

    measure(true);
    const follow = () => {
      tween = null;
      measure(false);
    };
    window.addEventListener("resize", follow);
    window.addEventListener("scroll", follow, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", follow);
      window.removeEventListener("scroll", follow, true);
    };
  }, [body, hidden, selector, session.isHandset, session.preset.rows.length]);

  useEffect(() => {
    if (hidden) return;
    cardRef.current?.focus();
  }, [step, hidden]);

  useEffect(() => {
    if (hidden) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const presetOpen = [...document.querySelectorAll("[data-howto-preset]")].some(isOpenDialog);
        if (presetOpen) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const items = focusableItems(card, targetRef.current);
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      const next = event.shiftKey
        ? items[(index <= 0 ? items.length : index) - 1]
        : items[index === -1 ? 0 : (index + 1) % items.length];
      next?.focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [hidden]);

  if (hidden) return null;

  const advance = () => {
    if (step === STEP.select) onClose();
    else setStep((current) => (current + 1) as HowToStep);
  };

  const ring = spot && !spot.missing ? spot.r + 2 : 0;
  const veil =
    spot && !spot.missing
      ? `M0 0 H${window.innerWidth} V${window.innerHeight} H0 Z M${spot.cx} ${spot.cy} m${-spot.r} 0 a${spot.r} ${spot.r} 0 1 0 ${spot.r * 2} 0 a${spot.r} ${spot.r} 0 1 0 ${-spot.r * 2} 0`
      : `M0 0 H${window.innerWidth} V${window.innerHeight} H0 Z`;

  return createPortal(
    <div className="contents" data-howto-root>
      <svg
        className="pointer-events-none fixed inset-0 z-70 h-full w-full"
        aria-hidden="true"
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        preserveAspectRatio="none"
      >
        <path
          d={veil}
          fill="rgb(0 0 0 / 0.5)"
          fillRule="evenodd"
          style={{ pointerEvents: "fill" }}
          onPointerDown={(event) => event.preventDefault()}
        />
      </svg>
      {spot && !spot.missing ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-71 rounded-full border-2 border-ring"
          style={{
            left: spot.cx - ring,
            top: spot.cy - ring,
            width: ring * 2,
            height: ring * 2,
          }}
        />
      ) : null}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="howto-title"
        aria-describedby="howto-body"
        data-howto-card
        tabIndex={-1}
        className="pointer-events-auto fixed z-80 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none"
        style={{
          left: spot?.cardLeft ?? 16,
          top: spot?.cardTop ?? 16,
          width: spot?.cardWidth ?? Math.min(352, window.innerWidth - 32),
          visibility: spot ? "visible" : "hidden",
        }}
      >
        <h2 id="howto-title" className="text-base font-semibold leading-snug">
          {STEPS[step].title}
        </h2>
        <p id="howto-body" className="mt-1 text-sm leading-6 text-muted-foreground">
          {emphasizeKeyboard(body)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm tabular-nums text-muted-foreground">
            {step + 1} of {HOW_TO_STEP_COUNT}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Skip
            </Button>
            <Button type="button" size="sm" onClick={advance}>
              {step === STEP.select ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
