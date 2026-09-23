import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accountStorageKey,
  dbRowsToLive,
  defaultCurrentSetup,
  liveToDb,
  loadCurrentSetup,
  loadHistory,
  loadLocalPresets,
  saveCurrentSetup,
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
    expect(loadHistory(null).map((e) => e.id)).toEqual(["guest"]);
    expect(loadHistory("alice").map((e) => e.id)).toEqual(["alice"]);

    saveHistory(
      [
        {
          id: "bob",
          savedAt: 3,
          presetName: "Bob",
          tally: 50,
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
      "bob",
    );

    expect(loadHistory("alice").map((e) => e.id)).toEqual(["alice"]);
    expect(loadHistory("bob").map((e) => e.id)).toEqual(["bob"]);
    expect(loadHistory(null).map((e) => e.id)).toEqual(["guest"]);
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

  it("seeds built-in presets only when no saved library exists", () => {
    expect(loadLocalPresets().map((preset) => preset.name)).toEqual([
      "5 Part",
      "Peripheral Blood",
      "Body Fluid",
      "Bone Marrow",
    ]);
  });

  it("preserves an intentionally empty saved preset library", () => {
    saveLocalPresets([]);
    expect(loadLocalPresets()).toEqual([]);
  });
});

describe("Firestore preset serialization", () => {
  it("preserves stable preset IDs while stripping live counts", () => {
    const preset = {
      id: "stable-preset-id",
      name: "Cloud panel",
      maxWBC: 100,
      rows: [
        {
          id: "live-row-id",
          key: "5",
          cell: "Neutrophil",
          count: 42,
          ignore: false,
          nrbc: false,
          lineage: "none" as const,
        },
      ],
    };

    const [stored] = liveToDb([preset]);
    expect(stored.id).toBe("stable-preset-id");
    expect(stored.rows[0]).not.toHaveProperty("count");
    expect(stored.rows[0]).not.toHaveProperty("id");

    const restored = dbRowsToLive(stored);
    expect(restored.id).toBe("stable-preset-id");
    expect(restored.rows[0]?.count).toBe(0);
  });

  it("upgrades legacy Firestore presets without IDs on the next write", () => {
    const legacy = dbRowsToLive({
      name: "Legacy cloud panel",
      maxWBC: 100,
      rows: [],
    });
    expect(legacy.id).toBeTruthy();
    expect(liveToDb([legacy])[0]?.id).toBe(legacy.id);
  });

  it("round-trips an intentionally empty Firestore preset list", () => {
    expect(liveToDb([])).toEqual([]);
  });
});

describe("current setup persistence", () => {
  it("stores and restores the working setup independently of saved presets", () => {
    const fallback = defaultCurrentSetup();
    const setup = {
      ...fallback.preset,
      name: "Working setup",
      rows: [{ ...fallback.preset.rows[0], cell: "Neutrophil", count: 12 }],
    };
    saveCurrentSetup(setup, { kind: "custom" }, "alice");
    const restored = loadCurrentSetup("alice");
    expect(restored?.preset.name).toBe("Working setup");
    expect(restored?.preset.rows[0]?.count).toBe(0);
    expect(restored?.source.kind).toBe("custom");
  });
});
