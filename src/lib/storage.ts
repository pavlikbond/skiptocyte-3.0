import { looksLikeNrbc } from "@/lib/counting";
import {
  blankPreset,
  builtInPresets,
  defaultEstimateCells,
} from '@/lib/presets';
import type {
  DbPreset,
  EstimateSettings,
  HistoryEntry,
  KeyboardType,
  Preset,
  PrintSettings,
  SoundSettings,
  ViewType,
} from '@/lib/types';
import { DEFAULT_PRINT, DEFAULT_SOUND, HISTORY_CAP } from '@/lib/types';
import { newId } from '@/lib/utils';

const KEYS = {
  presets: 'presets',
  presetList: 'presetList',
  tableSettings: 'tableSettings',
  printSettings: 'printSettings',
  estimateSettings: 'estimateSettings',
  viewType: 'viewType',
  keyboardType: 'keyboardType',
  theme: 'theme',
  countHistory: 'countHistory',
} as const;

/** Guest data uses the bare key; signed-in data stays on-device under `key:uid`. */
export function accountStorageKey(base: string, uid?: string | null) {
  return uid ? `${base}:${uid}` : base;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function dbRowsToLive(preset: DbPreset): Preset {
  return {
    id: newId(),
    name: preset.name,
    maxWBC: preset.maxWBC,
    rows: preset.rows.map((row) => {
      const cell = String(row.cell ?? "").slice(0, 25);
      const nrbc = Boolean(row.nrbc) || looksLikeNrbc(cell);
      return {
        id: newId(),
        key: String(row.key ?? ""),
        cell,
        count: 0,
        ignore: Boolean(row.ignore) || nrbc,
        nrbc,
        lineage: row.lineage ?? "none",
      };
    }),
  };
}

export function liveToDb(presets: Preset[]): DbPreset[] {
  return presets.map((p) => ({
    name: p.name,
    maxWBC: p.maxWBC,
    rows: p.rows.map((r) => ({
      ignore: r.ignore,
      key: r.key,
      cell: r.cell,
      nrbc: r.nrbc,
      lineage: r.lineage,
    })),
  }));
}

type LegacyPreset = {
  name: string;
  maxWBC: number;
  keyCells: [string | number, string, boolean][];
};

export function migratePresetList(): Preset[] | null {
  const legacy = readJson<LegacyPreset[]>(KEYS.presetList);
  if (!legacy || !Array.isArray(legacy) || legacy.length === 0) return null;
  const converted = legacy.map((p) =>
    dbRowsToLive({
      name: p.name,
      maxWBC: p.maxWBC,
      rows: (p.keyCells ?? []).map(([key, cell, ignore]) => ({
        key,
        cell,
        ignore: Boolean(ignore),
      })),
    }),
  );
  saveLocalPresets(converted);
  localStorage.removeItem(KEYS.presetList);
  return converted;
}

export function loadStoredPresets(uid?: string | null): Preset[] | null {
  const stored = readJson<DbPreset[]>(accountStorageKey(KEYS.presets, uid));
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored.map(dbRowsToLive);
  }
  if (!uid) {
    const migrated = migratePresetList();
    if (migrated) return migrated;
  }
  return null;
}

export function loadLocalPresets(uid?: string | null): Preset[] {
  return loadStoredPresets(uid) ?? builtInPresets();
}

export function saveLocalPresets(presets: Preset[], uid?: string | null) {
  writeJson(accountStorageKey(KEYS.presets, uid), liveToDb(presets));
}

export function loadSoundSettings(uid?: string | null): SoundSettings {
  const stored = readJson<{ soundSettings?: SoundSettings }>(
    accountStorageKey(KEYS.tableSettings, uid),
  );
  return stored?.soundSettings ?? DEFAULT_SOUND;
}

export function saveSoundSettings(
  soundSettings: SoundSettings,
  uid?: string | null,
) {
  writeJson(accountStorageKey(KEYS.tableSettings, uid), { soundSettings });
}

export function loadPrintSettings(): PrintSettings {
  const stored = readJson<PrintSettings>(KEYS.printSettings);
  if (!stored)
    return {
      ...DEFAULT_PRINT,
      fields: DEFAULT_PRINT.fields.map((f) => ({ ...f })),
    };
  return {
    ...DEFAULT_PRINT,
    ...stored,
    fields: (stored.fields ?? DEFAULT_PRINT.fields).map((f) => ({
      name: f.name,
      value: '',
    })),
  };
}

export function savePrintSettings(settings: PrintSettings) {
  writeJson(KEYS.printSettings, {
    ...settings,
    fields: settings.fields.map((f) => ({ name: f.name, value: '' })),
  });
}

export function loadEstimateSettings(): EstimateSettings {
  const stored = readJson<EstimateSettings>(KEYS.estimateSettings);
  if (!stored) {
    return {
      fieldCountMax: 10,
      fieldCountKey: '1',
      countedCells: defaultEstimateCells(),
    };
  }
  return {
    fieldCountMax: stored.fieldCountMax || 10,
    fieldCountKey: stored.fieldCountKey || '1',
    countedCells: (stored.countedCells ?? defaultEstimateCells()).map((c) => ({
      ...c,
      id: c.id || newId(),
      count: 0,
      factor: c.factor ?? 15000,
    })),
  };
}

export function saveEstimateSettings(settings: EstimateSettings) {
  writeJson(KEYS.estimateSettings, {
    fieldCountMax: settings.fieldCountMax,
    fieldCountKey: settings.fieldCountKey,
    countedCells: settings.countedCells.map((c) => ({ ...c, count: 0 })),
  });
}

export function loadViewType(): ViewType {
  const v = localStorage.getItem(KEYS.viewType);
  return v === 'estimate' ? 'estimate' : 'standard';
}

export function saveViewType(view: ViewType) {
  localStorage.setItem(KEYS.viewType, view);
}

export function loadKeyboardType(): KeyboardType {
  const v = localStorage.getItem(KEYS.keyboardType);
  return v === 'keyboard' ? 'keyboard' : 'numpad';
}

export function saveKeyboardType(type: KeyboardType) {
  localStorage.setItem(KEYS.keyboardType, type);
}

export function loadHistory(uid?: string | null): HistoryEntry[] {
  return (
    readJson<HistoryEntry[]>(accountStorageKey(KEYS.countHistory, uid)) ?? []
  );
}

export function saveHistory(entries: HistoryEntry[], uid?: string | null) {
  writeJson(
    accountStorageKey(KEYS.countHistory, uid),
    entries.slice(0, HISTORY_CAP),
  );
}

export function ensurePresets(list: Preset[]): Preset[] {
  if (list.length > 0) return list;
  return [blankPreset('Default', 100)];
}

export { KEYS as storageKeys };
