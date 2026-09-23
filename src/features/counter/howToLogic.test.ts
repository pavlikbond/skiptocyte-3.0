import { describe, expect, it } from "vitest";
import { STEP, countSpotlight, countStepBody, howToAnchor, placeCoachCard, selectStepShouldFinish, tourRowId } from "./howToLogic";

describe("tourRowId", () => {
  it("uses the last row added during the tour", () => {
    expect(tourRowId(["a", "b"], [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }])).toBe("d");
  });

  it("falls back to the last row when nothing was added", () => {
    expect(tourRowId(["a", "b"], [{ id: "a" }, { id: "b" }])).toBe("b");
  });

  it("returns null when the table is empty", () => {
    expect(tourRowId([], [])).toBeNull();
  });
});

describe("countSpotlight", () => {
  it("stays on the key cap when the cell has no key", () => {
    expect(countSpotlight("", false, false)).toEqual({ kind: "keycap" });
  });

  it("circles the pad key when that key is on screen", () => {
    expect(countSpotlight("7", true, false)).toEqual({ kind: "pad-key" });
  });

  it("circles the layout toggle on a wide layout when the key is hidden", () => {
    expect(countSpotlight("q", false, false)).toEqual({ kind: "layout" });
  });

  it("circles the pad on a handset when the key is hidden", () => {
    expect(countSpotlight("q", false, true)).toEqual({ kind: "pad" });
  });
});

describe("countStepBody", () => {
  it("asks them to set a key when the cell is unbound", () => {
    expect(countStepBody("Blast", "", false, false)).toBe(
      "This cell has no key yet. Set one, or continue.",
    );
  });

  it("tells them to press the key on the keyboard", () => {
    expect(countStepBody("Lymphocyte", "6", true, false)).toBe(
      "Press that key on your keyboard to add one.",
    );
  });

  it("names a hidden key", () => {
    expect(countStepBody("Neutrophils", "7", false, true)).toBe("Neutrophils is on 7. Press that key.");
    expect(countStepBody("Neutrophils", "q", false, false)).toContain("Switch the pad");
  });
});

describe("howToAnchor", () => {
  const base = {
    step: STEP.add,
    rowId: "row",
    key: "",
    keyOnPad: false,
    isHandset: false,
    savePresetVisible: false,
    saveDialogVisible: false,
    selectPresetVisible: false,
    switchDialogVisible: false,
  };

  it("names the new row, then its key", () => {
    expect(howToAnchor({ ...base, step: STEP.name })).toBe("cell-name");
    expect(howToAnchor({ ...base, step: STEP.name, rowId: null })).toBe("add-cell");
    expect(howToAnchor({ ...base, step: STEP.key })).toBe("keycap");
  });

  it("counts on the pad key once a key is bound", () => {
    expect(howToAnchor({ ...base, step: STEP.count, key: "7", keyOnPad: true })).toBe("pad-key");
    expect(howToAnchor({ ...base, step: STEP.limit })).toBe("count-limit");
    expect(howToAnchor({ ...base, step: STEP.presets })).toBe("presets");
  });

  it("follows the save dialog, then a different preset", () => {
    expect(howToAnchor({ ...base, step: STEP.save })).toBe("presets");
    expect(howToAnchor({ ...base, step: STEP.save, savePresetVisible: true })).toBe("save-preset");
    expect(howToAnchor({ ...base, step: STEP.save, savePresetVisible: true, saveDialogVisible: true })).toBe(
      "save-dialog",
    );
    expect(howToAnchor({ ...base, step: STEP.select, selectPresetVisible: true })).toBe("select-preset");
    expect(howToAnchor({ ...base, step: STEP.select, savePresetVisible: true })).toBe("save-preset");
    expect(
      howToAnchor({ ...base, step: STEP.select, selectPresetVisible: true, switchDialogVisible: true }),
    ).toBe("switch-dialog");
  });
});

describe("selectStepShouldFinish", () => {
  it("remembers the current setup and waits", () => {
    expect(selectStepShouldFinish(null, { kind: "custom" })).toEqual({
      baseline: "custom",
      finish: false,
    });
  });

  it("ends once a different preset is loaded", () => {
    expect(selectStepShouldFinish("custom", { kind: "saved", id: "pb" })).toEqual({
      baseline: "custom",
      finish: true,
    });
    expect(selectStepShouldFinish("a", { kind: "saved", id: "a" }).finish).toBe(false);
  });
});

describe("placeCoachCard", () => {
  it("docks to the top on a handset when the bottom would cover the hole", () => {
    const placed = placeCoachCard({
      hole: { cx: 180, cy: 640, r: 40 },
      card: { w: 328, h: 160 },
      viewport: { w: 360, h: 740 },
      handset: true,
    });
    expect(placed.top).toBe(16);
  });

  it("sits beside the hole on a wide layout", () => {
    const placed = placeCoachCard({
      hole: { cx: 200, cy: 300, r: 36 },
      card: { w: 320, h: 160 },
      viewport: { w: 1280, h: 800 },
      handset: false,
    });
    expect(placed.left).toBeGreaterThan(200);
    expect(placed.top).toBeGreaterThan(0);
  });
});
