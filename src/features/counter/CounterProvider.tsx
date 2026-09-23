import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useSaveCloudPresets,
  useSaveCloudSounds,
  useUserDoc,
} from "@/features/presets/useUserDoc";
import {
  playChannel,
  preloadSounds,
  resumeAudio,
} from "@/features/sounds/soundEngine";
import {
  alc,
  anc,
  anyCounts,
  applyDiffDelta,
  applyDiffKey,
  applyEstimateCellDelta,
  applyFieldDelta,
  clearRowCounts,
  correctedWbc,
  canAssignKey,
  meRatio,
  pushUndo,
  rowStats,
  stripCountsForSave,
  tally,
  zeroEstimate,
} from "@/lib/counting";
import { blankPreset } from "@/lib/presets";
import {
  defaultCurrentSetup,
  dbRowsToLive,
  loadCurrentSetup,
  loadEstimateSettings,
  loadHistory,
  loadKeyboardType,
  loadLocalPresets,
  loadPrintSettings,
  loadSoundSettings,
  saveCurrentSetup,
  saveEstimateSettings,
  saveHistory,
  saveKeyboardType,
  saveLocalPresets,
  savePrintSettings,
  saveSoundSettings,
  saveViewType,
  loadViewType,
} from "@/lib/storage";
import { presetFromHistory } from "@/lib/history";
import type {
  DiffRow,
  EstimateCell,
  HistoryEntry,
  KeyboardType,
  Lineage,
  MorphologyState,
  Preset,
  PrintSettings,
  SetupSource,
  SoundSettings,
  UndoAction,
  ViewType,
} from "@/lib/types";
import {
  DEFAULT_SOUND,
  EMPTY_MORPHOLOGY,
  HISTORY_CAP,
} from "@/lib/types";
import { isEditableTarget, newId } from "@/lib/utils";

type CounterContextValue = {
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
  morphology: MorphologyState;
  estimate: {
    fieldCount: number;
    fieldCountMax: number;
    fieldCountKey: string;
    cells: EstimateCell[];
  };
  print: PrintSettings;
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
  bindRowKey: (id: string, key: string) => boolean;
  clearSession: () => void;
  undo: () => void;
  bumpRow: (id: string, delta: 1 | -1) => void;
  setMorphology: (next: MorphologyState) => void;
  setEstimateMeta: (patch: Partial<{ fieldCountMax: number; fieldCountKey: string }>) => void;
  updateEstimateCell: (id: string, patch: Partial<EstimateCell>) => void;
  addEstimateCell: () => string;
  removeEstimateCell: (id: string) => void;
  bindEstimateKey: (id: string | "field", key: string) => boolean;
  bumpEstimateCell: (id: string, delta: 1 | -1) => void;
  bumpField: (delta: 1 | -1) => void;
  setPrint: (next: PrintSettings) => void;
  persistPrint: () => void;
  restorePrint: () => void;
  saveCountToHistory: () => void;
  loadHistoryEntry: (id: string, force?: boolean) => boolean;
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  updateSounds: (next: SoundSettings) => void;
  replacePresets: (next: Preset[]) => Promise<void>;
  mergePresets: (incoming: Preset[]) => Promise<void>;
};

const CounterContext = createContext<CounterContextValue | null>(null);

function pulse<T>(setter: (v: T | null) => void, value: T, ms = 180) {
  setter(value);
  window.setTimeout(() => setter(null), ms);
}

function clonePresetForSession(source: Preset): Preset {
  return {
    id: newId(),
    name: source.name,
    maxWBC: source.maxWBC,
    rows: source.rows.map((row) => ({
      ...row,
      id: newId(),
      count: 0,
    })),
  };
}

function dedupePresetIds(list: Preset[]): Preset[] {
  const seen = new Set<string>();
  return list.map((preset) => {
    if (!preset.id || seen.has(preset.id)) {
      return { ...preset, id: newId() };
    }
    seen.add(preset.id);
    return preset;
  });
}

export function CounterProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const userDoc = useUserDoc();
  const saveCloudPresets = useSaveCloudPresets();
  const saveCloudSounds = useSaveCloudSounds();

  const [ready, setReady] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [preset, setPreset] = useState<Preset>(blankPreset());
  const [setupSource, setSetupSource] = useState<SetupSource>({ kind: "custom" });
  const [wbcCount, setWbcCount] = useState(0);
  const [increase, setIncrease] = useState(true);
  const [view, setViewState] = useState<ViewType>("standard");
  const [keyboardType, setKeyboardTypeState] = useState<KeyboardType>("numpad");
  const [isHandset, setIsHandset] = useState(false);
  const [, setUndoStack] = useState<UndoAction[]>([]);
  const [flashRowId, setFlashRowId] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [flashTick, setFlashTick] = useState(0);
  const [shake, setShake] = useState(false);
  const [keyErrorId, setKeyErrorId] = useState<string | null>(null);
  const [morphology, setMorphology] = useState<MorphologyState>(EMPTY_MORPHOLOGY);
  const [fieldCount, setFieldCount] = useState(0);
  const [fieldCountMax, setFieldCountMax] = useState(10);
  const [fieldCountKey, setFieldCountKey] = useState("1");
  const [estimateCells, setEstimateCells] = useState<EstimateCell[]>([]);
  const [print, setPrint] = useState<PrintSettings>(loadPrintSettings);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyUid, setHistoryUid] = useState<string | null | undefined>(undefined);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(DEFAULT_SOUND);
  const [cloudHydrated, setCloudHydrated] = useState(false);

  // Swap before paint so a logout cannot keep showing the previous account's counts.
  if (!authLoading && historyUid !== uid) {
    setHistoryUid(uid);
    setHistory(loadHistory(uid));
  }

  const persistSavedPresets = useCallback(
    async (next: Preset[], includeEmail = false) => {
      const deduped = dedupePresetIds(next);
      if (uid) {
        await saveCloudPresets.mutateAsync({ presets: deduped, includeEmail });
      } else {
        saveLocalPresets(deduped);
      }
    },
    [saveCloudPresets, uid],
  );

  const persistCurrent = useCallback(
    (nextPreset: Preset, nextSource: SetupSource) => {
      saveCurrentSetup(stripCountsForSave(nextPreset), nextSource, uid);
    },
    [uid],
  );

  const adoptTemplate = useCallback(
    (template: Preset, source: SetupSource, force = false) => {
      if (!force && anyCounts(preset.rows)) return false;
      const next = clonePresetForSession(template);
      setPreset(next);
      setSetupSource(source);
      setUndoStack([]);
      setMorphology(EMPTY_MORPHOLOGY);
      persistCurrent(next, source);
      return true;
    },
    [persistCurrent, preset.rows],
  );

  useLayoutEffect(() => {
    if (authLoading) {
      setReady(false);
      return;
    }

    const saved = dedupePresetIds(loadLocalPresets(uid));
    setPresets(saved);

    const storedSetup = loadCurrentSetup(uid);
    if (storedSetup) {
      const matchedSource =
        storedSetup.source.kind === "builtin"
          ? saved.find((item) => item.name === storedSetup.source.name)
          : null;
      const source: SetupSource = matchedSource
        ? { kind: "saved", id: matchedSource.id, name: matchedSource.name }
        : storedSetup.source;
      setPreset(storedSetup.preset);
      setSetupSource(source);
      if (matchedSource) persistCurrent(storedSetup.preset, source);
    } else if (saved[0]) {
      const next = clonePresetForSession(saved[0]);
      const source: SetupSource = { kind: "saved", id: saved[0].id, name: saved[0].name };
      setPreset(next);
      setSetupSource(source);
      persistCurrent(next, source);
    } else {
      const fallback = defaultCurrentSetup();
      const next = clonePresetForSession(fallback.preset);
      setPreset(next);
      setSetupSource(fallback.source);
      persistCurrent(next, fallback.source);
    }

    setViewState(loadViewType());
    setKeyboardTypeState(loadKeyboardType());
    setSoundSettings(loadSoundSettings(uid));
    const est = loadEstimateSettings();
    setFieldCountMax(est.fieldCountMax);
    setFieldCountKey(est.fieldCountKey);
    setEstimateCells(est.countedCells);
    setPrint(loadPrintSettings());
    setHistory(loadHistory(uid));
    setWbcCount(0);
    setIncrease(true);
    setUndoStack([]);
    setMorphology(EMPTY_MORPHOLOGY);
    setFieldCount(0);
    setFlashRowId(null);
    setFlashKey(null);
    setShake(false);
    setKeyErrorId(null);
    setCloudHydrated(false);
    setReady(true);
    void preloadSounds();
  }, [authLoading, persistCurrent, uid]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsHandset(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!uid || !userDoc.data || cloudHydrated) return;
    const data = userDoc.data;
    if (Array.isArray(data.presets)) {
      const needsStableIds = data.presets.some((item) => !item.id);
      const live = dedupePresetIds(data.presets.map(dbRowsToLive));
      setPresets(live);
      if (needsStableIds) void persistSavedPresets(live);
      else saveLocalPresets(live, uid);
    } else {
      const seed = dedupePresetIds(loadLocalPresets(uid));
      setPresets(seed);
      void persistSavedPresets(seed, true);
    }
    if (data.tableSettings?.soundSettings) {
      setSoundSettings(data.tableSettings.soundSettings);
      saveSoundSettings(data.tableSettings.soundSettings, uid);
    }
    setCloudHydrated(true);
    setReady(true);
  }, [cloudHydrated, persistSavedPresets, uid, userDoc.data]);

  useEffect(() => {
    if (setupSource.kind !== "saved") return;
    if (presets.some((item) => item.id === setupSource.id)) return;
    const matched = presets.find((item) => item.name === setupSource.name);
    if (matched) {
      const source: SetupSource = { kind: "saved", id: matched.id, name: matched.name };
      setSetupSource(source);
      persistCurrent(preset, source);
      return;
    }
    const nextSource: SetupSource = { kind: "custom", name: setupSource.name };
    setSetupSource(nextSource);
    persistCurrent(preset, nextSource);
  }, [persistCurrent, preset, presets, setupSource]);

  const persistEstimate = useCallback(
    (cells: EstimateCell[], max = fieldCountMax, key = fieldCountKey) => {
      saveEstimateSettings({
        fieldCountMax: max,
        fieldCountKey: key,
        countedCells: cells,
      });
    },
    [fieldCountMax, fieldCountKey],
  );

  const feedback = useCallback(
    (outcome: "ok" | "blocked" | "unbound", rowId?: string | null, key?: string) => {
      void resumeAudio();
      if (outcome === "ok") {
        playChannel("change", soundSettings);
        if (rowId) setFlashRowId(rowId);
        if (key) setFlashKey(key);
        if (rowId || key) setFlashTick((n) => n + 1);
        try {
          void navigator.vibrate?.(200);
        } catch {
          // Ignore vibration errors.
        }
      } else if (outcome === "blocked") {
        playChannel("max", soundSettings);
        setShake(true);
        window.setTimeout(() => setShake(false), 350);
      }
    },
    [soundSettings],
  );

  const updatePreset = useCallback(
    (updater: (current: Preset) => Preset, options?: { persistStructure?: boolean }) => {
      setPreset((current) => {
        const next = updater(current);
        if (options?.persistStructure) persistCurrent(next, setupSource);
        return next;
      });
    },
    [persistCurrent, setupSource],
  );

  const applySavedPreset = useCallback(
    (id: string, force = false) => {
      const next = presets.find((item) => item.id === id);
      if (!next) return false;
      return adoptTemplate(next, { kind: "saved", id: next.id, name: next.name }, force);
    },
    [adoptTemplate, presets],
  );

  const saveCurrentAsPreset = useCallback(
    async (name: string) => {
      const cleaned = name.trim() || "New Preset";
      const nextPreset = { ...stripCountsForSave(preset), id: newId(), name: cleaned };
      const nextList = dedupePresetIds([...presets, nextPreset]);
      setPresets(nextList);
      const source: SetupSource = { kind: "saved", id: nextPreset.id, name: nextPreset.name };
      setSetupSource(source);
      persistCurrent(preset, source);
      await persistSavedPresets(nextList);
    },
    [persistCurrent, persistSavedPresets, preset, presets],
  );

  const updateSavedPreset = useCallback(async (id: string) => {
    const existing = presets.find((item) => item.id === id);
    if (!existing) return;
    const nextPreset = {
      ...stripCountsForSave(preset),
      id: existing.id,
      name: existing.name,
    };
    const nextList = presets.map((item) => (item.id === id ? nextPreset : item));
    setPresets(nextList);
    const source: SetupSource = { kind: "saved", id: existing.id, name: existing.name };
    setSetupSource(source);
    persistCurrent(preset, source);
    await persistSavedPresets(nextList);
  }, [persistCurrent, persistSavedPresets, preset, presets]);

  const renameSavedPreset = useCallback(
    async (id: string, name: string) => {
      const cleaned = name.trim();
      if (!cleaned) return;
      const nextList = presets.map((item) => (item.id === id ? { ...item, name: cleaned } : item));
      setPresets(nextList);
      if (setupSource.kind === "saved" && setupSource.id === id) {
        const source: SetupSource = { kind: "saved", id, name: cleaned };
        setSetupSource(source);
        persistCurrent(preset, source);
      }
      await persistSavedPresets(nextList);
    },
    [persistCurrent, persistSavedPresets, preset, presets, setupSource],
  );

  const deleteSavedPreset = useCallback(
    async (id: string) => {
      const target = presets.find((item) => item.id === id);
      if (!target) return;
      const nextList = presets.filter((item) => item.id !== id);
      setPresets(nextList);
      if (setupSource.kind === "saved" && setupSource.id === id) {
        const source: SetupSource = { kind: "custom", name: target.name };
        setSetupSource(source);
        persistCurrent(preset, source);
      }
      await persistSavedPresets(nextList);
    },
    [persistCurrent, persistSavedPresets, preset, presets, setupSource],
  );

  const bumpRow = useCallback(
    (id: string, delta: 1 | -1) => {
      const result = applyDiffDelta(preset.rows, id, delta, preset.maxWBC);
      if (result.outcome === "ok") {
        updatePreset((p) => ({ ...p, rows: result.rows }));
        setUndoStack((s) => pushUndo(s, { kind: "diff", rowId: id, delta }));
      }
      const row = preset.rows.find((r) => r.id === id);
      feedback(result.outcome, id, row?.key);
    },
    [feedback, preset, updatePreset],
  );

  const bumpEstimateCell = useCallback(
    (id: string, delta: 1 | -1) => {
      const result = applyEstimateCellDelta(
        estimateCells,
        id,
        delta,
        fieldCount,
        fieldCountMax,
        increase && delta === 1,
      );
      if (result.outcome === "ok") {
        setEstimateCells(result.cells);
        setUndoStack((s) => pushUndo(s, { kind: "estimate-cell", cellId: id, delta }));
      }
      const cell = estimateCells.find((c) => c.id === id);
      feedback(result.outcome, id, cell?.key);
    },
    [estimateCells, feedback, fieldCount, fieldCountMax, increase],
  );

  const bumpField = useCallback(
    (delta: 1 | -1) => {
      const result = applyFieldDelta(fieldCount, fieldCountMax, delta);
      if (result.outcome === "ok") {
        setFieldCount(result.fieldCount);
        setUndoStack((s) => pushUndo(s, { kind: "estimate-field", delta }));
      }
      feedback(result.outcome, null, fieldCountKey);
    },
    [feedback, fieldCount, fieldCountKey, fieldCountMax],
  );

  const handleKey = useCallback(
    (key: string) => {
      if (view === "estimate") {
        if (key === fieldCountKey) {
          bumpField(increase ? 1 : -1);
          return;
        }
        const cell = estimateCells.find((c) => c.key && c.key === key);
        if (cell) bumpEstimateCell(cell.id, increase ? 1 : -1);
        return;
      }
      const result = applyDiffKey(preset.rows, key, increase, preset.maxWBC);
      if (result.outcome === "ok" && result.rowId) {
        updatePreset((p) => ({ ...p, rows: result.rows }));
        setUndoStack((s) =>
          pushUndo(s, {
            kind: "diff",
            rowId: result.rowId!,
            delta: increase ? 1 : -1,
          }),
        );
      }
      feedback(result.outcome, result.rowId, key);
    },
    [
      bumpEstimateCell,
      bumpField,
      estimateCells,
      feedback,
      fieldCountKey,
      increase,
      preset.rows,
      preset.maxWBC,
      updatePreset,
      view,
    ],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key === "Backspace" || (event.ctrlKey && event.key.toLowerCase() === "z")) {
        event.preventDefault();
        setUndoStack((stack) => {
          const last = stack.at(-1);
          if (!last) return stack;
          if (last.kind === "diff") {
            const reverse: 1 | -1 = last.delta === 1 ? -1 : 1;
            const result = applyDiffDelta(
              preset.rows,
              last.rowId,
              reverse,
              preset.maxWBC,
            );
            if (result.outcome === "ok") {
              updatePreset((p) => ({ ...p, rows: result.rows }));
            }
          }
          if (last.kind === "estimate-cell") {
            setEstimateCells((cells) => {
              const result = applyEstimateCellDelta(
                cells,
                last.cellId,
                last.delta === 1 ? -1 : 1,
                fieldCount,
                fieldCountMax,
                false,
              );
              return result.cells;
            });
          }
          if (last.kind === "estimate-field") {
            setFieldCount((n) => {
              const result = applyFieldDelta(
                n,
                fieldCountMax,
                last.delta === 1 ? -1 : 1,
              );
              return result.fieldCount;
            });
          }
          return stack.slice(0, -1);
        });
        return;
      }
      handleKey(event.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fieldCount, fieldCountMax, handleKey, preset.maxWBC, preset.rows, updatePreset]);

  const bindRowKey = useCallback(
    (id: string, key: string) => {
      if (!canAssignKey(key, preset.rows, id)) {
        pulse(setKeyErrorId, id, 1000);
        return false;
      }
      updatePreset(
        (p) => ({
          ...p,
          rows: p.rows.map((r) => (r.id === id ? { ...r, key } : r)),
        }),
        { persistStructure: true },
      );
      return true;
    },
    [preset.rows, updatePreset],
  );

  const bindEstimateKey = useCallback(
    (id: string | "field", key: string) => {
      if (id === "field") {
        if (!canAssignKey(key, estimateCells)) {
          pulse(setKeyErrorId, "field", 1000);
          return false;
        }
        setFieldCountKey(key);
        persistEstimate(estimateCells, fieldCountMax, key);
        return true;
      }
      if (!canAssignKey(key, estimateCells, id, [fieldCountKey])) {
        pulse(setKeyErrorId, id, 1000);
        return false;
      }
      setEstimateCells((cells) => {
        const next = cells.map((c) => (c.id === id ? { ...c, key } : c));
        persistEstimate(next);
        return next;
      });
      return true;
    },
    [estimateCells, fieldCountKey, fieldCountMax, persistEstimate],
  );

  const clearSession = useCallback(() => {
    if (view === "estimate") {
      setEstimateCells((cells) => zeroEstimate(cells));
      setFieldCount(0);
    } else {
      updatePreset((p) => ({ ...p, rows: clearRowCounts(p.rows) }));
    }
    setUndoStack([]);
  }, [updatePreset, view]);

  const undo = useCallback(() => {
    const event = new KeyboardEvent("keydown", { key: "Backspace" });
    window.dispatchEvent(event);
  }, []);

  const loadHistoryEntry = useCallback(
    (id: string, force = false) => {
      const entry = history.find((item) => item.id === id);
      if (!entry) return false;
      if (!force && anyCounts(preset.rows)) return false;

      const next = presetFromHistory(entry, [...presets, preset]);
      const source: SetupSource = {
        kind: "history",
        name: entry.presetName || "History count",
      };
      setPreset(next);
      setSetupSource(source);
      setWbcCount(entry.wbcCount);
      setMorphology(entry.morphology);
      setUndoStack([]);
      setFlashRowId(null);
      setFlashKey(null);
      setViewState("standard");
      saveViewType("standard");
      persistCurrent(next, source);
      return true;
    },
    [history, persistCurrent, preset, presets],
  );

  const saveCountToHistory = useCallback(() => {
    if (authLoading) return;
    const stats = rowStats(preset.rows, wbcCount);
    const sourceLabel = setupSource.kind === "custom" ? "Custom setup" : setupSource.name;
    const entry: HistoryEntry = {
      id: newId(),
      savedAt: Date.now(),
      presetName: sourceLabel,
      tally: tally(preset.rows),
      maxWBC: preset.maxWBC,
      wbcCount,
      correctedWbc: correctedWbc(preset.rows, wbcCount),
      anc: anc(preset.rows, wbcCount),
      alc: alc(preset.rows, wbcCount),
      meRatio: meRatio(preset.rows),
      rows: preset.rows.map((r) => ({
        key: r.key,
        cell: r.cell,
        count: r.count,
        ignore: r.ignore,
        nrbc: r.nrbc,
        lineage: r.lineage,
        relative: stats.get(r.id)?.relative ?? 0,
        absolute: stats.get(r.id)?.absolute ?? 0,
      })),
      morphology,
    };
    setHistory((list) => {
      const next = [entry, ...list].slice(0, HISTORY_CAP);
      saveHistory(next, uid);
      return next;
    });
  }, [authLoading, morphology, preset, setupSource, uid, wbcCount]);

  const stats = useMemo(
    () => rowStats(preset.rows, wbcCount),
    [preset.rows, wbcCount],
  );

  const value = useMemo<CounterContextValue>(() => ({
    ready,
    saving: saveCloudPresets.isPending,
    presets,
    preset,
    setupSource,
    wbcCount,
    increase,
    view,
    keyboardType: isHandset ? "numpad" : keyboardType,
    isHandset,
    stats,
    tallyValue: tally(preset.rows),
    corrected: correctedWbc(preset.rows, wbcCount),
    ancValue: anc(preset.rows, wbcCount),
    alcValue: alc(preset.rows, wbcCount),
    me: meRatio(preset.rows),
    flashRowId,
    flashKey,
    flashTick,
    shake,
    keyErrorId,
    morphology,
    estimate: {
      fieldCount,
      fieldCountMax,
      fieldCountKey,
      cells: estimateCells,
    },
    print,
    history,
    soundSettings,
    setWbcCount,
    setIncrease,
    setView: (v) => {
      setViewState(v);
      saveViewType(v);
    },
    setKeyboardType: (v) => {
      setKeyboardTypeState(v);
      saveKeyboardType(v);
    },
    applySavedPreset,
    saveCurrentAsPreset,
    updateSavedPreset,
    renameSavedPreset,
    deleteSavedPreset,
    setMaxWBC: (n) =>
      updatePreset(
        (p) => ({ ...p, maxWBC: Math.max(1, Math.floor(n) || 1) }),
        { persistStructure: true },
      ),
    updateRow: (id, patch) =>
      updatePreset(
        (p) => ({
          ...p,
          rows: p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }),
        { persistStructure: true },
      ),
    addRow: () => {
      const id = newId();
      updatePreset(
        (p) => ({
          ...p,
          rows: [
            ...p.rows,
            {
              id,
              key: "",
              cell: "",
              count: 0,
              ignore: false,
              nrbc: false,
              lineage: "none" as Lineage,
            },
          ],
        }),
        { persistStructure: true },
      );
      return id;
    },
    removeRow: (id) =>
      updatePreset(
        (p) => ({
          ...p,
          rows: p.rows.filter((r) => r.id !== id),
        }),
        { persistStructure: true },
      ),
    reorderRows: (from, to) =>
      updatePreset(
        (p) => {
          const rows = [...p.rows];
          const [moved] = rows.splice(from, 1);
          rows.splice(to, 0, moved);
          return { ...p, rows };
        },
        { persistStructure: true },
      ),
    bindRowKey,
    clearSession,
    undo,
    bumpRow,
    setMorphology,
    setEstimateMeta: (patch) => {
      if (patch.fieldCountMax != null) {
        setFieldCountMax(patch.fieldCountMax);
        persistEstimate(estimateCells, patch.fieldCountMax, fieldCountKey);
      }
      if (patch.fieldCountKey != null) {
        setFieldCountKey(patch.fieldCountKey);
      }
    },
    updateEstimateCell: (id, patch) => {
      setEstimateCells((cells) => {
        const next = cells.map((c) => (c.id === id ? { ...c, ...patch } : c));
        persistEstimate(next);
        return next;
      });
    },
    addEstimateCell: () => {
      const id = newId();
      setEstimateCells((cells) => {
        const next = [...cells, { id, key: "", name: "", factor: 15000, count: 0 }];
        persistEstimate(next);
        return next;
      });
      return id;
    },
    removeEstimateCell: (id) => {
      setEstimateCells((cells) => {
        const next = cells.filter((c) => c.id !== id);
        persistEstimate(next);
        return next;
      });
    },
    bindEstimateKey,
    bumpEstimateCell,
    bumpField,
    setPrint,
    persistPrint: () => savePrintSettings(print),
    restorePrint: () => setPrint(loadPrintSettings()),
    saveCountToHistory,
    loadHistoryEntry,
    deleteHistoryEntry: (id) => {
      if (authLoading) return;
      setHistory((list) => {
        const next = list.filter((e) => e.id !== id);
        saveHistory(next, uid);
        return next;
      });
    },
    clearHistory: () => {
      if (authLoading) return;
      setHistory([]);
      saveHistory([], uid);
    },
    updateSounds: (next) => {
      setSoundSettings(next);
      if (uid) void saveCloudSounds.mutateAsync(next);
      else saveSoundSettings(next);
    },
    replacePresets: async (next) => {
      const list = dedupePresetIds(next);
      setPresets(list);
      await persistSavedPresets(list);
      if (setupSource.kind === "saved" && !list.some((item) => item.id === setupSource.id)) {
        const source: SetupSource = { kind: "custom", name: setupSource.name };
        setSetupSource(source);
        persistCurrent(preset, source);
      }
    },
    mergePresets: async (incoming) => {
      const list = dedupePresetIds([...presets, ...incoming]);
      setPresets(list);
      await persistSavedPresets(list);
    },
  }), [
    ready,
    saveCloudPresets.isPending,
    presets,
    preset,
    setupSource,
    wbcCount,
    increase,
    view,
    isHandset,
    keyboardType,
    stats,
    flashRowId,
    flashKey,
    flashTick,
    shake,
    keyErrorId,
    morphology,
    fieldCount,
    fieldCountMax,
    fieldCountKey,
    estimateCells,
    print,
    history,
    soundSettings,
    applySavedPreset,
    saveCurrentAsPreset,
    updateSavedPreset,
    renameSavedPreset,
    deleteSavedPreset,
    updatePreset,
    bindRowKey,
    clearSession,
    undo,
    bumpRow,
    persistEstimate,
    bindEstimateKey,
    bumpEstimateCell,
    bumpField,
    saveCountToHistory,
    loadHistoryEntry,
    authLoading,
    uid,
    saveCloudSounds,
    persistSavedPresets,
    persistCurrent,
  ]);

  return (
    <CounterContext.Provider value={value}>{children}</CounterContext.Provider>
  );
}

export function useCounter() {
  const ctx = useContext(CounterContext);
  if (!ctx) throw new Error("useCounter must be used within CounterProvider");
  return ctx;
}
