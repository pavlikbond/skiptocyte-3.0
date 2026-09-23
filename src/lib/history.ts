import type { RowStats } from "@/lib/counting";
import { normalizeStoredKey } from "@/lib/keys";
import type { DiffRow, HistoryEntry, Preset } from "@/lib/types";
import { newId } from "@/lib/utils";

export const HISTORY_LABEL_MAX = 80;

/** Keep a history label as typed, including spaces, and cap its length. */
export function historyLabel(value: string) {
  return value.slice(0, HISTORY_LABEL_MAX);
}

function normalizedName(value: string) {
  return value.trim().toLowerCase();
}

export function presetFromHistory(
  entry: HistoryEntry,
  references: Preset[],
): Preset {
  const preferred = references.find(
    (preset) => normalizedName(preset.name) === normalizedName(entry.presetName),
  );
  const orderedReferences = preferred
    ? [preferred, ...references.filter((preset) => preset.id !== preferred.id)]
    : references;
  const usedKeys = new Set<string>();

  return {
    id: newId(),
    name: entry.presetName || "History count",
    maxWBC: entry.maxWBC,
    rows: entry.rows.map((savedRow) => {
      const matchingRow = orderedReferences
        .flatMap((preset) => preset.rows)
        .find(
          (row) => normalizedName(row.cell) === normalizedName(savedRow.cell),
        );
      const candidateKey = normalizeStoredKey(savedRow.key ?? matchingRow?.key ?? "");
      const key =
        candidateKey && !usedKeys.has(candidateKey) ? candidateKey : "";
      if (key) usedKeys.add(key);

      return {
        id: newId(),
        key,
        cell: savedRow.cell,
        count: savedRow.count,
        ignore: savedRow.ignore,
        nrbc: savedRow.nrbc,
        lineage: savedRow.lineage ?? matchingRow?.lineage ?? "none",
      };
    }),
  };
}

export function reportRowsFromHistory(entry: HistoryEntry): {
  rows: DiffRow[];
  stats: Map<string, RowStats>;
} {
  const rows: DiffRow[] = entry.rows.map((savedRow, index) => ({
    id: `${entry.id}:${index}`,
    key: normalizeStoredKey(savedRow.key),
    cell: savedRow.cell,
    count: savedRow.count,
    ignore: savedRow.ignore,
    nrbc: savedRow.nrbc,
    lineage: savedRow.lineage ?? "none",
  }));
  const stats = new Map<string, RowStats>();
  rows.forEach((row, index) => {
    const saved = entry.rows[index];
    stats.set(row.id, {
      relative: saved?.relative ?? 0,
      absolute: saved?.absolute ?? 0,
    });
  });
  return { rows, stats };
}
