import { describe, expect, it } from "vitest";
import {
  keyLabel,
  normalizeKey,
  normalizeStoredKey,
  NUM_LOCK,
  NUMPAD_ENTER,
} from "./keys";

describe("normalizeKey", () => {
  it("normalizes numpad digits and operators from event.code", () => {
    expect(normalizeKey({ key: "Clear", code: "Numpad5" })).toBe("5");
    expect(normalizeKey({ key: "ArrowLeft", code: "Numpad4" })).toBe("4");
    expect(normalizeKey({ key: "Delete", code: "NumpadDecimal" })).toBe(".");
    expect(normalizeKey({ key: "End", code: "Numpad1" })).toBe("1");
    expect(normalizeKey({ key: "Enter", code: "NumpadEnter" })).toBe(NUMPAD_ENTER);
  });

  it("keeps regular printable keys and NumLock", () => {
    expect(normalizeKey({ key: "a", code: "KeyA" })).toBe("a");
    expect(normalizeKey({ key: "/" })).toBe("/");
    expect(normalizeKey({ key: NUM_LOCK, code: "NumLock" })).toBe(NUM_LOCK);
  });

  it("rejects modifiers, non-printable keys, and spaces", () => {
    expect(normalizeKey({ key: "z", ctrlKey: true })).toBeNull();
    expect(normalizeKey({ key: "ArrowUp", code: "ArrowUp" })).toBeNull();
    expect(normalizeKey({ key: "Enter", code: "Enter" })).toBeNull();
    expect(normalizeKey({ key: " " })).toBeNull();
    expect(normalizeKey({ key: "Shift", code: "ShiftLeft" })).toBeNull();
  });
});

describe("normalizeStoredKey", () => {
  it("migrates legacy Enter and removes dead keys", () => {
    expect(normalizeStoredKey("Enter")).toBe(NUMPAD_ENTER);
    expect(normalizeStoredKey("ArrowUp")).toBe("");
    expect(normalizeStoredKey("Shift")).toBe("");
    expect(normalizeStoredKey(" ")).toBe("");
  });

  it("keeps supported stored keys", () => {
    expect(normalizeStoredKey("5")).toBe("5");
    expect(normalizeStoredKey(NUMPAD_ENTER)).toBe(NUMPAD_ENTER);
    expect(normalizeStoredKey(NUM_LOCK)).toBe(NUM_LOCK);
    expect(normalizeStoredKey("/")).toBe("/");
  });
});

describe("keyLabel", () => {
  it("renders human labels for sentinel keys", () => {
    expect(keyLabel(NUMPAD_ENTER)).toBe("Enter");
    expect(keyLabel(NUM_LOCK)).toBe("Num");
    expect(keyLabel("5")).toBe("5");
  });
});
