import { describe, expect, it } from "vitest";
import { applyUndo } from "@/features/counter/counterSession";
import type { UndoAction } from "@/lib/types";

function buildRows() {
  return [
    { id: "r1", key: "1", cell: "Seg", count: 2, ignore: false, nrbc: false, lineage: "myeloid" as const },
    { id: "r2", key: "2", cell: "Lymph", count: 0, ignore: false, nrbc: false, lineage: "none" as const },
  ];
}

describe("applyUndo", () => {
  it("reverses a diff change and pops stack", () => {
    const result = applyUndo({
      rows: buildRows(),
      maxWBC: 100,
      estimateCells: [],
      fieldCount: 0,
      fieldCountMax: 10,
      undoStack: [{ kind: "diff", rowId: "r1", delta: 1 }],
    });
    expect(result.changed).toBe(true);
    expect(result.rows[0].count).toBe(1);
    expect(result.undoStack).toHaveLength(0);
  });

  it("keeps undo stack when a reverse cannot be applied", () => {
    const undoStack: UndoAction[] = [{ kind: "diff", rowId: "r1", delta: 1 }];
    const result = applyUndo({
      rows: [
        { id: "r1", key: "1", cell: "Seg", count: 0, ignore: false, nrbc: false, lineage: "myeloid" as const },
      ],
      maxWBC: 100,
      estimateCells: [],
      fieldCount: 0,
      fieldCountMax: 10,
      undoStack,
    });
    expect(result.changed).toBe(false);
    expect(result.undoStack).toEqual(undoStack);
  });
});
