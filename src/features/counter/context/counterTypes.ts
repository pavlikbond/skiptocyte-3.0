import { rowStats } from "@/lib/counting";
import type {
  DiffRow,
  EstimateCell,
  HistoryEntry,
  KeyboardType,
  MorphologyState,
  Preset,
  SetupSource,
  SoundSettings,
  ViewType,
} from "@/lib/types";

export type KeyBindResult = { ok: boolean; swappedWith: string | null };
export type CaptureTarget = { id: string } | null;

export type CounterContextValue = {
  ready: boolean;
  saving: boolean;
  presets: Preset[];
  preset: Preset;
  setupSource: SetupSource;
  wbcCount: number;
  increase: boolean;
  view: ViewType;
  keyboardType: KeyboardType;
  isHandset: boolean;
  stats: ReturnType<typeof rowStats>;
  tallyValue: number;
  corrected: number | null;
  ancValue: number | null;
  alcValue: number | null;
  me: string | null;
  flashRowId: string | null;
  flashKey: string | null;
  flashTick: number;
  shake: boolean;
  keyErrorId: string | null;
  capture: CaptureTarget;
  captureLabel: string | null;
  captureNotice: string | null;
  morphology: MorphologyState;
  estimate: {
    fieldCount: number;
    fieldCountMax: number;
    fieldCountKey: string;
    cells: EstimateCell[];
  };
  history: HistoryEntry[];
  soundSettings: SoundSettings;
  setWbcCount: (n: number) => void;
  setIncrease: (v: boolean) => void;
  setView: (v: ViewType) => void;
  setKeyboardType: (v: KeyboardType) => void;
  applySavedPreset: (id: string, force?: boolean) => boolean;
  saveCurrentAsPreset: (name: string) => Promise<void>;
  updateSavedPreset: (id: string) => Promise<void>;
  renameSavedPreset: (id: string, name: string) => Promise<void>;
  deleteSavedPreset: (id: string) => Promise<void>;
  setMaxWBC: (n: number) => void;
  updateRow: (id: string, patch: Partial<DiffRow>) => void;
  addRow: () => string;
  removeRow: (id: string) => void;
  reorderRows: (from: number, to: number) => void;
  bindRowKey: (id: string, key: string) => KeyBindResult;
  startCapture: (id: string) => void;
  cancelCapture: () => void;
  captureKey: (key: string | null) => boolean;
  clearSession: () => void;
  undo: () => void;
  bumpRow: (id: string, delta: 1 | -1) => void;
  setMorphology: (next: MorphologyState) => void;
  setEstimateMeta: (patch: Partial<{ fieldCountMax: number; fieldCountKey: string }>) => void;
  updateEstimateCell: (id: string, patch: Partial<EstimateCell>) => void;
  addEstimateCell: () => string;
  removeEstimateCell: (id: string) => void;
  bindEstimateKey: (id: string | "field", key: string) => KeyBindResult;
  bumpEstimateCell: (id: string, delta: 1 | -1) => void;
  bumpField: (delta: 1 | -1) => void;
  saveCountToHistory: () => void;
  loadHistoryEntry: (id: string, force?: boolean) => boolean;
  renameHistoryEntry: (id: string, label: string) => void;
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  updateSounds: (next: SoundSettings) => void;
  replacePresets: (next: Preset[]) => Promise<void>;
  mergePresets: (incoming: Preset[]) => Promise<void>;
  setRuntimeActive: (active: boolean) => void;
};

export type CounterSessionValue = Pick<
  CounterContextValue,
  | "ready"
  | "preset"
  | "setupSource"
  | "wbcCount"
  | "increase"
  | "view"
  | "keyboardType"
  | "isHandset"
  | "stats"
  | "tallyValue"
  | "corrected"
  | "ancValue"
  | "alcValue"
  | "me"
  | "flashRowId"
  | "flashKey"
  | "flashTick"
  | "shake"
  | "keyErrorId"
  | "capture"
  | "captureLabel"
  | "captureNotice"
  | "morphology"
  | "estimate"
  | "setWbcCount"
  | "setIncrease"
  | "setView"
  | "setKeyboardType"
  | "setMaxWBC"
  | "updateRow"
  | "addRow"
  | "removeRow"
  | "reorderRows"
  | "bindRowKey"
  | "startCapture"
  | "cancelCapture"
  | "captureKey"
  | "clearSession"
  | "undo"
  | "bumpRow"
  | "setMorphology"
  | "setEstimateMeta"
  | "updateEstimateCell"
  | "addEstimateCell"
  | "removeEstimateCell"
  | "bindEstimateKey"
  | "bumpEstimateCell"
  | "bumpField"
  | "setRuntimeActive"
>;

export type CounterPresetsValue = Pick<
  CounterContextValue,
  | "saving"
  | "presets"
  | "setupSource"
  | "applySavedPreset"
  | "saveCurrentAsPreset"
  | "updateSavedPreset"
  | "renameSavedPreset"
  | "deleteSavedPreset"
  | "replacePresets"
  | "mergePresets"
>;

export type CounterHistoryValue = Pick<
  CounterContextValue,
  | "ready"
  | "history"
  | "saveCountToHistory"
  | "loadHistoryEntry"
  | "renameHistoryEntry"
  | "deleteHistoryEntry"
  | "clearHistory"
>;

export type CounterSoundsValue = Pick<
  CounterContextValue,
  "soundSettings" | "updateSounds"
>;
