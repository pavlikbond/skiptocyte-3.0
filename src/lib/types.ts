export type Lineage = "myeloid" | "erythroid" | "none";

export type DiffRow = {
  id: string;
  key: string;
  cell: string;
  count: number;
  ignore: boolean;
  nrbc: boolean;
  lineage: Lineage;
};

export type Preset = {
  id: string;
  name: string;
  maxWBC: number;
  rows: DiffRow[];
};

export type DbRow = {
  ignore: boolean;
  key: string | number;
  cell: string;
  nrbc?: boolean;
  lineage?: Lineage;
};

export type DbPreset = {
  id?: string;
  name: string;
  maxWBC: number;
  rows: DbRow[];
};

export type SetupSource =
  | { kind: "builtin"; name: string }
  | { kind: "saved"; id: string; name: string }
  | { kind: "history"; name: string }
  | { kind: "custom"; name?: string };

export type SoundChannel = {
  play: boolean;
  track: number;
};

export type SoundSettings = {
  max: SoundChannel;
  change: SoundChannel;
};

export type PrintField = { name: string; value: string };

export type PrintSettings = {
  reportTitle: string;
  paperSize: "Letter" | "A4";
  units: string;
  showCell: boolean;
  showCount: boolean;
  showRelative: boolean;
  showAbsolute: boolean;
  showUnits: boolean;
  showIgnored: boolean;
  showWBC: boolean;
  showMorphology: boolean;
  fields: PrintField[];
};

export type EstimateCell = {
  id: string;
  key: string;
  name: string;
  factor: number | null;
  count: number;
};

export type EstimateSettings = {
  fieldCountMax: number;
  fieldCountKey: string;
  countedCells: EstimateCell[];
};

export type UndoAction =
  | { kind: "diff"; rowId: string; delta: 1 | -1 }
  | { kind: "estimate-cell"; cellId: string; delta: 1 | -1 }
  | { kind: "estimate-field"; delta: 1 | -1 };

export type CountOutcome = "ok" | "blocked" | "unbound";

export type MorphologyGrade = 0 | 1 | 2 | 3;

export type MorphologyState = {
  grades: Record<string, MorphologyGrade>;
  plateletEstimate: "" | "low" | "adequate" | "increased";
  giantPlatelets: boolean;
};

export type HistoryEntry = {
  id: string;
  savedAt: number;
  /** User note for this snapshot. Absent on counts saved before labels existed. */
  label?: string;
  presetName: string;
  tally: number;
  maxWBC: number;
  wbcCount: number;
  correctedWbc: number | null;
  anc: number | null;
  alc: number | null;
  meRatio: string | null;
  rows: {
    key?: string;
    cell: string;
    count: number;
    ignore: boolean;
    nrbc: boolean;
    lineage?: Lineage;
    relative: number;
    absolute: number;
  }[];
  morphology: MorphologyState;
};

export type ViewType = "standard" | "estimate";
export type KeyboardType = "numpad" | "keyboard";

export type UserDoc = {
  email?: string;
  presets?: DbPreset[];
  tableSettings?: { soundSettings: SoundSettings };
  subscription?: unknown;
};

export const GRADE_MORPH_ITEMS = [
  { id: "anisocytosis", label: "Anisocytosis" },
  { id: "poikilocytosis", label: "Poikilocytosis" },
  { id: "hypochromia", label: "Hypochromia" },
  { id: "polychromasia", label: "Polychromasia" },
  { id: "microcytosis", label: "Microcytosis" },
  { id: "macrocytosis", label: "Macrocytosis" },
  { id: "target", label: "Target cells" },
  { id: "schistocytes", label: "Schistocytes" },
  { id: "sickle", label: "Sickle cells" },
  { id: "spherocytes", label: "Spherocytes" },
  { id: "ovalocytes", label: "Ovalocytes" },
  { id: "teardrops", label: "Teardrops" },
  { id: "burr", label: "Burr / echinocytes" },
  { id: "stippling", label: "Basophilic stippling" },
  { id: "hjb", label: "Howell–Jolly bodies" },
] as const;

const PLATELET_ESTIMATE_LABELS: Record<
  Exclude<MorphologyState["plateletEstimate"], "">,
  string
> = {
  low: "Low",
  adequate: "Adequate",
  increased: "Increased",
};

export function morphologyFindings(morphology: MorphologyState): string[] {
  const lines = GRADE_MORPH_ITEMS.filter(
    (item) => (morphology.grades[item.id] ?? 0) > 0,
  ).map((item) => `${item.label}: ${morphology.grades[item.id]}+`);
  if (morphology.plateletEstimate) {
    lines.push(
      `Platelet estimate: ${PLATELET_ESTIMATE_LABELS[morphology.plateletEstimate]}`,
    );
  }
  if (morphology.giantPlatelets) {
    lines.push("Giant platelets: yes");
  }
  return lines;
}

export const DEFAULT_PRINT_FIELDS: PrintField[] = [
  { name: "Specimen #", value: "" },
  { name: "MRN", value: "" },
  { name: "Name", value: "" },
  { name: "DOB", value: "" },
  { name: "Tech", value: "" },
  { name: "Date", value: "" },
];

export const DEFAULT_PRINT: PrintSettings = {
  reportTitle: "Report",
  paperSize: "Letter",
  units: "x10^9/L",
  showCell: true,
  showCount: false,
  showRelative: true,
  showAbsolute: true,
  showUnits: true,
  showIgnored: false,
  showWBC: true,
  showMorphology: false,
  fields: DEFAULT_PRINT_FIELDS.map((f) => ({ ...f })),
};

export const DEFAULT_SOUND: SoundSettings = {
  max: { play: true, track: 1 },
  change: { play: true, track: 1 },
};

export const EMPTY_MORPHOLOGY: MorphologyState = {
  grades: {},
  plateletEstimate: "",
  giantPlatelets: false,
};

export const UNDO_LIMIT = 30;
export const HISTORY_CAP = 50;
export const CELL_NAME_MAX = 25;
export const TRACK_COUNT = 6;
