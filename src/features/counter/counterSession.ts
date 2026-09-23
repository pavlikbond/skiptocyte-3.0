import {
  applyDiffDelta,
  applyEstimateCellDelta,
  applyFieldDelta,
} from "@/lib/counting";
import type { DiffRow, EstimateCell, UndoAction } from "@/lib/types";

export type CounterUndoState = {
  rows: DiffRow[];
  maxWBC: number;
  estimateCells: EstimateCell[];
  fieldCount: number;
  fieldCountMax: number;
  undoStack: UndoAction[];
};

export type CounterUndoResult = {
  rows: DiffRow[];
  estimateCells: EstimateCell[];
  fieldCount: number;
  undoStack: UndoAction[];
  changed: boolean;
};

export function applyUndo(state: CounterUndoState): CounterUndoResult {
  const last = state.undoStack.at(-1);
  if (!last) {
    return {
      rows: state.rows,
      estimateCells: state.estimateCells,
      fieldCount: state.fieldCount,
      undoStack: state.undoStack,
      changed: false,
    };
  }

  if (last.kind === "diff") {
    const reverse: 1 | -1 = last.delta === 1 ? -1 : 1;
    const result = applyDiffDelta(state.rows, last.rowId, reverse, state.maxWBC);
    if (result.outcome !== "ok") {
      return {
        rows: state.rows,
        estimateCells: state.estimateCells,
        fieldCount: state.fieldCount,
        undoStack: state.undoStack,
        changed: false,
      };
    }
    return {
      rows: result.rows,
      estimateCells: state.estimateCells,
      fieldCount: state.fieldCount,
      undoStack: state.undoStack.slice(0, -1),
      changed: true,
    };
  }

  if (last.kind === "estimate-cell") {
    const result = applyEstimateCellDelta(
      state.estimateCells,
      last.cellId,
      last.delta === 1 ? -1 : 1,
      state.fieldCount,
      state.fieldCountMax,
      false,
    );
    if (result.outcome !== "ok") {
      return {
        rows: state.rows,
        estimateCells: state.estimateCells,
        fieldCount: state.fieldCount,
        undoStack: state.undoStack,
        changed: false,
      };
    }
    return {
      rows: state.rows,
      estimateCells: result.cells,
      fieldCount: state.fieldCount,
      undoStack: state.undoStack.slice(0, -1),
      changed: true,
    };
  }

  const result = applyFieldDelta(
    state.fieldCount,
    state.fieldCountMax,
    last.delta === 1 ? -1 : 1,
  );
  if (result.outcome !== "ok") {
    return {
      rows: state.rows,
      estimateCells: state.estimateCells,
      fieldCount: state.fieldCount,
      undoStack: state.undoStack,
      changed: false,
    };
  }

  return {
    rows: state.rows,
    estimateCells: state.estimateCells,
    fieldCount: result.fieldCount,
    undoStack: state.undoStack.slice(0, -1),
    changed: true,
  };
}
