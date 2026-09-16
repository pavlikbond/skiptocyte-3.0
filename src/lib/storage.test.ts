import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountStorageKey,
  loadHistory,
  loadLocalPresets,
  saveHistory,
  saveLocalPresets,
  storageKeys,
} from "./storage";
import { HISTORY_CAP } from "./types";

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memory,
  });
}

beforeEach(() => {
  installMemoryLocalStorage();
});

afterEach(() => {
  localStorage.clear();
});

describe("accountStorageKey", () => {
  it("keeps guest data on the bare key", () => {
    expect(accountStorageKey(storageKeys.presets)).toBe("presets");
    expect(accountStorageKey(storageKeys.countHistory, null)).toBe(
      "countHistory",
    );
  });

  it("scopes signed-in data by uid", () => {
    expect(accountStorageKey(storageKeys.presets, "alice")).toBe("presets:alice");
  });
});

describe("identity-scoped history", () => {
  it("does not leak signed-in history into the guest workspace", () => {
    saveHistory(
      [
        {
          id: "guest",
          savedAt: 1,
          presetName: "Guest",
          tally: 10,
          maxWBC: 100,
          wbcCount: 0,
          correctedWbc: null,
          anc: null,
          alc: null,
          meRatio: null,
          rows: [],
          morphology: {
            grades: {},
            plateletEstimate: "",
            giantPlatelets: false,
          },
        },
      ],
      null,
    );
    saveHistory(
      [
        {
          id: "alice",
          savedAt: 2,
          presetName: "Alice",
          tally: 100,
          maxWBC: 100,
          wbcCount: 0,
          correctedWbc: null,
          anc: null,
          alc: null,
          meRatio: null,
          rows: [],
          morphology: {
            grades: {},
            plateletEstimate: "",
            giantPlatelets: false,
          },
        },
      ],
      "alice",
    );

    expect(loadHistory().map((e) => e.id)).toEqual(["guest"]);
    expect(loadHistory("alice").map((e) => e.id)).toEqual(["alice"]);
  });

  it("caps saved history", () => {
    const entries = Array.from({ length: HISTORY_CAP + 5 }, (_, i) => ({
      id: String(i),
      savedAt: i,
      presetName: "P",
      tally: 1,
      maxWBC: 100,
      wbcCount: 0,
      correctedWbc: null,
      anc: null,
      alc: null,
      meRatio: null,
      rows: [],
      morphology: {
        grades: {},
        plateletEstimate: "" as const,
        giantPlatelets: false,
      },
    }));
    saveHistory(entries);
    expect(loadHistory()).toHaveLength(HISTORY_CAP);
  });
});

describe("identity-scoped presets", () => {
  it("does not overwrite guest presets when saving a signed-in cache", () => {
    saveLocalPresets(
      [{ id: "g", name: "Guest panel", maxWBC: 100, rows: [] }],
      null,
    );
    saveLocalPresets(
      [{ id: "a", name: "Alice panel", maxWBC: 200, rows: [] }],
      "alice",
    );

    expect(loadLocalPresets()[0]?.name).toBe("Guest panel");
    expect(loadLocalPresets("alice")[0]?.name).toBe("Alice panel");
  });
});
