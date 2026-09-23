import { describe, expect, it } from "vitest";
import {
  alc,
  anc,
  applyDiffKey,
  applyEstimateCellDelta,
  applyFieldDelta,
  canAssignKey,
  correctedWbc,
  keysInUse,
  meRatio,
  rowStats,
  tally,
} from "./counting";
import type { DiffRow } from "./types";

function r(
  partial: Partial<DiffRow> & Pick<DiffRow, "cell">,
): DiffRow {
  return {
    id: partial.id ?? partial.cell,
    key: partial.key ?? "",
    cell: partial.cell,
    count: partial.count ?? 0,
    ignore: partial.ignore ?? false,
    nrbc: partial.nrbc ?? false,
    lineage: partial.lineage ?? "none",
  };
}

describe("tally and ignore", () => {
  it("excludes ignored rows from tally", () => {
    const rows = [
      r({ cell: "Neutrophil", count: 40 }),
      r({ cell: "nRBC", count: 10, ignore: true, nrbc: true }),
    ];
    expect(tally(rows)).toBe(40);
  });

  it("blocks increment of non-ignored rows at max", () => {
    const rows = [
      r({ id: "n", cell: "Neutrophil", key: "5", count: 100 }),
      r({ id: "nr", cell: "nRBC", key: "+", count: 0, ignore: true, nrbc: true }),
    ];
    const blocked = applyDiffKey(rows, "5", true, 100);
    expect(blocked.outcome).toBe("blocked");
    const nrbc = applyDiffKey(rows, "+", true, 100);
    expect(nrbc.outcome).toBe("ok");
    expect(nrbc.rows.find((x) => x.id === "nr")?.count).toBe(1);
  });

  it("blocks decrement at zero", () => {
    const rows = [r({ cell: "Lymphocyte", key: "6", count: 0 })];
    expect(applyDiffKey(rows, "6", false, 100).outcome).toBe("blocked");
  });
});

describe("relative and absolute", () => {
  it("uses one decimal percent and three decimal absolute", () => {
    const rows = [
      r({ id: "n", cell: "Neutrophil", count: 1 }),
      r({ id: "l", cell: "Lymphocyte", count: 2 }),
    ];
    const stats = rowStats(rows, 10);
    expect(stats.get("n")?.relative).toBe(33.3);
    expect(stats.get("n")?.absolute).toBe(3.333);
    expect(stats.get("l")?.relative).toBe(66.7);
  });

  it("blanks ignored relatives", () => {
    const rows = [
      r({ id: "n", cell: "Neutrophil", count: 10 }),
      r({ id: "x", cell: "Other", count: 5, ignore: true }),
    ];
    const stats = rowStats(rows, 8);
    expect(stats.get("x")?.relative).toBe(0);
    expect(stats.get("x")?.absolute).toBe(0);
  });
});

describe("corrected WBC, ANC, ALC, M:E", () => {
  it("computes corrected WBC from nRBCs", () => {
    const rows = [
      r({ cell: "Neutrophil", count: 100 }),
      r({ cell: "nRBC", count: 25, ignore: true, nrbc: true }),
    ];
    expect(correctedWbc(rows, 10)).toBe(8);
  });

  it("does not double-count neutrophil and seg", () => {
    const rows = [
      r({ cell: "Neutrophil", count: 50 }),
      r({ cell: "Seg", count: 20 }),
      r({ cell: "Band", count: 10 }),
      r({ cell: "Lymphocyte", count: 20 }),
    ];
    expect(anc(rows, 10)).toBe(6);
    expect(alc(rows, 10)).toBe(2);
  });

  it("shows M:E as myeloid/erythroid : 1, dash if zero", () => {
    const empty = [
      r({ cell: "Seg", lineage: "myeloid", count: 32 }),
      r({ cell: "Pronormo", lineage: "erythroid", count: 0 }),
    ];
    expect(meRatio(empty)).toBeNull();
    const ok = [
      r({ cell: "Seg", lineage: "myeloid", count: 32 }),
      r({ cell: "Pronormo", lineage: "erythroid", count: 10 }),
    ];
    expect(meRatio(ok)).toBe("3.2:1");
  });
});

describe("estimate", () => {
  it("refuses cell increment at field max in + mode", () => {
    const cells = [{ id: "p", key: "2", name: "platelet", factor: 15000, count: 0 }];
    const r1 = applyEstimateCellDelta(cells, "p", 1, 10, 10, true);
    expect(r1.outcome).toBe("blocked");
    const r2 = applyFieldDelta(10, 10, 1);
    expect(r2.outcome).toBe("blocked");
    const r3 = applyFieldDelta(0, 10, -1);
    expect(r3.outcome).toBe("blocked");
  });
});

describe("key assignment", () => {
  const rows = [
    { id: "eos", key: "" },
    { id: "neut", key: "5" },
  ];
  const estimate = [{ id: "plt", key: "2" }];

  it("lets a diff row take 1 or 2 even if estimate uses those keys", () => {
    expect(canAssignKey("1", rows, "eos", [])).toBe(true);
    expect(canAssignKey("2", rows, "eos")).toBe(true);
    expect(keysInUse(rows, "eos").has("1")).toBe(false);
    expect(keysInUse(rows, "eos").has("2")).toBe(false);
  });

  it("still rejects a key already used by another row in the same view", () => {
    expect(canAssignKey("5", rows, "eos")).toBe(false);
    expect(canAssignKey("2", estimate, "new-cell", ["1"])).toBe(false);
    expect(canAssignKey("1", estimate, "plt", ["1"])).toBe(false);
  });

  it("allows rebinding the same key on the same row", () => {
    expect(canAssignKey("5", rows, "neut")).toBe(true);
    expect(canAssignKey("2", estimate, "plt", ["1"])).toBe(true);
  });

  it("treats numeric stored keys as the same as string keys", () => {
    const mixed = [{ id: "a", key: 2 }];
    expect(keysInUse(mixed).has("2")).toBe(true);
    expect(canAssignKey("2", mixed, "b")).toBe(false);
  });
});
