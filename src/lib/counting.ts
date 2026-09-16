import type {
  CountOutcome,
  DiffRow,
  EstimateCell,
  Preset,
  UndoAction,
} from '@/lib/types';
import { UNDO_LIMIT } from '@/lib/types';

export function tally(rows: DiffRow[]): number {
  return rows.reduce((sum, row) => (row.ignore ? sum : sum + row.count), 0);
}

function nameKey(cell: string) {
  return cell.trim().toLowerCase();
}

export function looksLikeNrbc(cell: string) {
  const n = nameKey(cell).replace(/[.\s_\-/]/g, "");
  return (
    n === "nrbc" ||
    n === "nrbcs" ||
    n === "nucleatedrbc" ||
    n === "nucleatedrbcs" ||
    n === "nucleatedred" ||
    n === "nucleatedreds" ||
    n === "nucleatedredcell" ||
    n === "nucleatedredcells"
  );
}

export function isNrbcRow(row: DiffRow) {
  return row.nrbc || looksLikeNrbc(row.cell);
}

export function nRbcTotal(rows: DiffRow[]): number {
  return rows.reduce((sum, row) => (isNrbcRow(row) ? sum + row.count : sum), 0);
}

export type RowStats = {
  relative: number;
  absolute: number;
};

export function rowStats(
  rows: DiffRow[],
  wbcCount: number,
): Map<string, RowStats> {
  const t = tally(rows);
  const map = new Map<string, RowStats>();
  for (const row of rows) {
    if (row.ignore || t === 0) {
      map.set(row.id, { relative: 0, absolute: 0 });
      continue;
    }
    const rel = row.count / t;
    map.set(row.id, {
      relative: Math.round(rel * 1000) / 10,
      absolute: Math.round(rel * wbcCount * 1000) / 1000,
    });
  }
  return map;
}

export function correctedWbc(rows: DiffRow[], wbcCount: number): number | null {
  const n = nRbcTotal(rows);
  if (n === 0 || wbcCount === 0) return null;
  return Math.round(((wbcCount * 100) / (100 + n)) * 1000) / 1000;
}

function isNeutrophilName(cell: string) {
  const n = nameKey(cell);
  return n === 'neutrophil' || n === 'neutrophils';
}

function isSegName(cell: string) {
  const n = nameKey(cell);
  return (
    n === 'seg' ||
    n === 'segs' ||
    n === 'segmented' ||
    n === 'segmented neutrophil'
  );
}

function isBandName(cell: string) {
  const n = nameKey(cell);
  return n === 'band' || n === 'bands';
}

function isLymphName(cell: string) {
  const n = nameKey(cell);
  return n === 'lymphocyte' || n === 'lymphocytes' || n === 'lymph';
}

function effectiveWbc(rows: DiffRow[], wbcCount: number) {
  return correctedWbc(rows, wbcCount) ?? wbcCount;
}

export function anc(rows: DiffRow[], wbcCount: number): number | null {
  const t = tally(rows);
  if (t === 0 || wbcCount === 0) return null;
  const counted = rows.filter((r) => !r.ignore);
  const hasNeut = counted.some((r) => isNeutrophilName(r.cell));
  const segs = counted.filter((r) =>
    hasNeut ? isNeutrophilName(r.cell) : isSegName(r.cell),
  );
  const bands = counted.filter((r) => isBandName(r.cell));
  if (segs.length === 0 && bands.length === 0) return null;
  const count = [...segs, ...bands].reduce((s, r) => s + r.count, 0);
  const wbc = effectiveWbc(rows, wbcCount);
  return Math.round((count / t) * wbc * 1000) / 1000;
}

export function alc(rows: DiffRow[], wbcCount: number): number | null {
  const t = tally(rows);
  if (t === 0 || wbcCount === 0) return null;
  const lymphs = rows.filter((r) => !r.ignore && isLymphName(r.cell));
  if (lymphs.length === 0) return null;
  const count = lymphs.reduce((s, r) => s + r.count, 0);
  const wbc = effectiveWbc(rows, wbcCount);
  return Math.round((count / t) * wbc * 1000) / 1000;
}

export function meRatio(rows: DiffRow[]): string | null {
  const myeloid = rows
    .filter((r) => r.lineage === 'myeloid')
    .reduce((s, r) => s + r.count, 0);
  const erythroid = rows
    .filter((r) => r.lineage === 'erythroid')
    .reduce((s, r) => s + r.count, 0);
  if (myeloid === 0 || erythroid === 0) return null;
  const ratio = Math.round((myeloid / erythroid) * 10) / 10;
  return `${ratio}:1`;
}

export function pushUndo(stack: UndoAction[], action: UndoAction) {
  return [...stack, action].slice(-UNDO_LIMIT);
}

export function applyDiffDelta(
  rows: DiffRow[],
  rowId: string,
  delta: 1 | -1,
  maxWBC: number,
): { rows: DiffRow[]; outcome: CountOutcome } {
  const idx = rows.findIndex((r) => r.id === rowId);
  if (idx < 0) return { rows, outcome: 'unbound' };
  const row = rows[idx];
  if (delta === 1) {
    if (!row.ignore && tally(rows) >= maxWBC) {
      return { rows, outcome: 'blocked' };
    }
    const next = rows.map((r, i) =>
      i === idx ? { ...r, count: r.count + 1 } : r,
    );
    return { rows: next, outcome: 'ok' };
  }
  if (row.count <= 0) return { rows, outcome: 'blocked' };
  const next = rows.map((r, i) =>
    i === idx ? { ...r, count: r.count - 1 } : r,
  );
  return { rows: next, outcome: 'ok' };
}

export function applyDiffKey(
  rows: DiffRow[],
  key: string,
  increase: boolean,
  maxWBC: number,
): { rows: DiffRow[]; rowId: string | null; outcome: CountOutcome } {
  const row = rows.find((r) => r.key !== '' && r.key === key);
  if (!row) return { rows, rowId: null, outcome: 'unbound' };
  const delta: 1 | -1 = increase ? 1 : -1;
  const result = applyDiffDelta(rows, row.id, delta, maxWBC);
  return { ...result, rowId: row.id };
}

export function clearRowCounts(rows: DiffRow[]): DiffRow[] {
  return rows.map((r) => ({ ...r, count: 0 }));
}

export function anyCounts(rows: DiffRow[]) {
  return rows.some((r) => r.count > 0);
}

export function keysInUse(
  rows: { id: string; key: string }[],
  exceptId?: string,
): Set<string> {
  return new Set(
    rows.filter((r) => r.key && r.id !== exceptId).map((r) => r.key),
  );
}

export function applyEstimateCellDelta(
  cells: EstimateCell[],
  cellId: string,
  delta: 1 | -1,
  fieldCount: number,
  fieldCountMax: number,
  increase: boolean,
): { cells: EstimateCell[]; outcome: CountOutcome } {
  const idx = cells.findIndex((c) => c.id === cellId);
  if (idx < 0) return { cells, outcome: 'unbound' };
  const cell = cells[idx];
  if (delta === 1) {
    if (increase && fieldCount >= fieldCountMax) {
      return { cells, outcome: 'blocked' };
    }
    const next = cells.map((c, i) =>
      i === idx ? { ...c, count: c.count + 1 } : c,
    );
    return { cells: next, outcome: 'ok' };
  }
  if (cell.count <= 0) return { cells, outcome: 'blocked' };
  const next = cells.map((c, i) =>
    i === idx ? { ...c, count: c.count - 1 } : c,
  );
  return { cells: next, outcome: 'ok' };
}

export function applyFieldDelta(
  fieldCount: number,
  fieldCountMax: number,
  delta: 1 | -1,
): { fieldCount: number; outcome: CountOutcome } {
  if (delta === 1) {
    if (fieldCount >= fieldCountMax) {
      return { fieldCount, outcome: 'blocked' };
    }
    return { fieldCount: fieldCount + 1, outcome: 'ok' };
  }
  if (fieldCount <= 0) return { fieldCount, outcome: 'blocked' };
  return { fieldCount: fieldCount - 1, outcome: 'ok' };
}

export function estimateValues(
  cell: EstimateCell,
  fieldCount: number,
  fieldCountMax: number,
) {
  const fields = Math.min(fieldCount, fieldCountMax);
  const average = fields === 0 ? 0 : cell.count / fields;
  const factor = cell.factor ?? 0;
  const estimate = average * factor;
  return { fields, average, estimate };
}

export function zeroEstimate(cells: EstimateCell[]): EstimateCell[] {
  return cells.map((c) => ({ ...c, count: 0 }));
}

export function stripCountsForSave(preset: Preset): Preset {
  return {
    ...preset,
    rows: preset.rows.map((r) => ({ ...r, count: 0 })),
  };
}
