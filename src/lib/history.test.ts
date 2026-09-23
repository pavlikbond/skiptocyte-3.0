import { describe, expect, it } from "vitest";
import { presetFromHistory, reportRowsFromHistory } from "./history";
import type { HistoryEntry, Preset } from "./types";

function historyEntry(
  rows: HistoryEntry["rows"],
  presetName = "Old preset",
): HistoryEntry {
  return {
    id: "history-1",
    savedAt: 1,
    presetName,
    tally: 10,
    maxWBC: 100,
    wbcCount: 7.5,
    correctedWbc: null,
    anc: null,
    alc: null,
    meRatio: null,
    rows,
    morphology: {
      grades: {},
      plateletEstimate: "",
      giantPlatelets: false,
    },
  };
}

describe("presetFromHistory", () => {
  it("restores self-contained history rows and their counts", () => {
    const restored = presetFromHistory(
      historyEntry([
        {
          key: "5",
          cell: "Neutrophil",
          count: 10,
          ignore: false,
          nrbc: false,
          lineage: "myeloid",
          relative: 100,
          absolute: 7.5,
        },
      ]),
      [],
    );

    expect(restored.name).toBe("Old preset");
    expect(restored.maxWBC).toBe(100);
    expect(restored.rows[0]).toMatchObject({
      key: "5",
      cell: "Neutrophil",
      count: 10,
      lineage: "myeloid",
    });
  });

  it("recovers keys and lineage for older history from a matching preset", () => {
    const reference: Preset = {
      id: "reference",
      name: "Old preset",
      maxWBC: 100,
      rows: [
        {
          id: "row",
          key: "5",
          cell: "Neutrophil",
          count: 0,
          ignore: false,
          nrbc: false,
          lineage: "myeloid",
        },
      ],
    };
    const restored = presetFromHistory(
      historyEntry([
        {
          cell: "Neutrophil",
          count: 8,
          ignore: false,
          nrbc: false,
          relative: 80,
          absolute: 6,
        },
      ]),
      [reference],
    );

    expect(restored.rows[0]).toMatchObject({
      key: "5",
      count: 8,
      lineage: "myeloid",
    });
  });

  it("leaves keys blank when an old history row has no matching reference", () => {
    const restored = presetFromHistory(
      historyEntry([
        {
          cell: "Archived cell",
          count: 4,
          ignore: false,
          nrbc: false,
          relative: 100,
          absolute: 4,
        },
      ]),
      [],
    );

    expect(restored.rows[0]?.key).toBe("");
  });

  it("normalizes legacy saved keys while restoring history rows", () => {
    const restored = presetFromHistory(
      historyEntry([
        {
          key: "Enter",
          cell: "Neutrophil",
          count: 8,
          ignore: false,
          nrbc: false,
          relative: 80,
          absolute: 6,
        },
      ]),
      [],
    );
    expect(restored.rows[0]?.key).toBe("NumpadEnter");
  });
});

describe("reportRowsFromHistory", () => {
  it("keeps saved percents and counts for a PDF of that snapshot", () => {
    const { rows, stats } = reportRowsFromHistory(
      historyEntry([
        {
          key: "5",
          cell: "Neutrophil",
          count: 10,
          ignore: false,
          nrbc: false,
          lineage: "myeloid",
          relative: 100,
          absolute: 7.5,
        },
      ]),
    );

    expect(rows[0]).toMatchObject({
      id: "history-1:0",
      cell: "Neutrophil",
      count: 10,
    });
    expect(stats.get("history-1:0")).toEqual({
      relative: 100,
      absolute: 7.5,
    });
  });
});
