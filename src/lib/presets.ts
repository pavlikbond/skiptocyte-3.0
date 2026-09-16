import { newId } from "@/lib/utils";
import type { DiffRow, Lineage, Preset } from "@/lib/types";

function row(
  key: string,
  cell: string,
  lineage: Lineage = "none",
): DiffRow {
  return {
    id: newId(),
    key,
    cell,
    count: 0,
    ignore: false,
    nrbc: false,
    lineage,
  };
}

export function builtInPresets(): Preset[] {
  return [
    {
      id: newId(),
      name: "5 Part",
      maxWBC: 100,
      rows: [
        row("5", "Neutrophil"),
        row("2", "Basophil"),
        row("4", "Monocyte"),
        row("1", "Eosinophil"),
        row("6", "Lymphocyte"),
      ],
    },
    {
      id: newId(),
      name: "Peripheral Blood",
      maxWBC: 100,
      rows: [
        row("5", "Neutrophil"),
        row("2", "Basophil"),
        row("4", "Monocyte"),
        row("1", "Eosinophil"),
        row("6", "Lymphocyte"),
        row("3", "Band"),
        row("7", "Metamyelocyte"),
        row("8", "Promyelocyte"),
        row("9", "Myelocyte"),
        row("0", "Blast"),
        row("+", "Other"),
      ],
    },
    {
      id: newId(),
      name: "Body Fluid",
      maxWBC: 100,
      rows: [
        row("5", "Neutrophil"),
        row("2", "Basophil"),
        row("4", "Monocyte"),
        row("1", "Eosinophil"),
        row("6", "Lymphocyte"),
        row("3", "Macrophage"),
        row("+", "Lining Cell"),
        row("0", "Other"),
      ],
    },
    {
      id: newId(),
      name: "Bone Marrow",
      maxWBC: 100,
      rows: [
        row("0", "Blast", "myeloid"),
        row("9", "Promyelocyte", "myeloid"),
        row("7", "Myelocyte", "myeloid"),
        row("8", "Metamyelocyte", "myeloid"),
        row("3", "Band", "myeloid"),
        row("5", "Seg", "myeloid"),
        row("4", "Monocyte", "myeloid"),
        row("*", "Eos Myelo", "myeloid"),
        row("1", "Eosinophil", "myeloid"),
        row("2", "Basophil", "myeloid"),
        row("6", "Lymphocyte", "none"),
        row("/", "Plasma Cell", "none"),
        row("+", "Mast Cell", "none"),
        row(".", "Pronormo", "erythroid"),
        row("a", "Baso Normo", "erythroid"),
        row("b", "Poly normo", "erythroid"),
        row("c", "Ortho Normo", "erythroid"),
      ],
    },
  ];
}

export function blankPreset(name = "New Preset", maxWBC = 100): Preset {
  return {
    id: newId(),
    name,
    maxWBC,
    rows: [
      {
        id: newId(),
        key: "",
        cell: "",
        count: 0,
        ignore: false,
        nrbc: false,
        lineage: "none",
      },
    ],
  };
}

export function defaultEstimateCells() {
  return [
    {
      id: newId(),
      key: "2",
      name: "platelet",
      factor: 15000 as number | null,
      count: 0,
    },
  ];
}
