import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  applyDiffDelta,
  applyDiffKey,
  applyEstimateCellDelta,
  applyFieldDelta,
  clearRowCounts,
  correctedWbc,
  keysInUse,
  meRatio,
  pushUndo,
  rowStats,
  tally,
  zeroEstimate,
} from "@/lib/counting";
import { blankPreset } from "@/lib/presets";
import { dbRowsToLive } from "@/lib/storage";
import {
  ensurePresets,
  loadEstimateSettings,
  loadHistory,
  loadKeyboardType,
  loadLocalPresets,
  loadPrintSettings,
  loadSoundSettings,
  loadViewType,
  saveEstimateSettings,
  saveHistory,
  saveKeyboardType,
  saveLocalPresets,
  savePrintSettings,
  saveSoundSettings,
  saveViewType,
} from "@/lib/storage";
import type {
  DiffRow,
  EstimateCell,
  HistoryEntry,
  KeyboardType,
  Lineage,
  MorphologyState,
  Preset,
  PrintSettings,
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
  selectedId: string;
  preset: Preset;
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
  selectPreset: (id: string) => void;
  saveNow: () => Promise<void>;
  createPreset: (name: string, maxWBC: number) => void;
  deletePreset: () => void;
  renamePreset: (name: string) => void;
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
  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;
  updateSounds: (next: SoundSettings) => void;
  replacePresets: (next: Preset[], persist?: boolean) => void;
  mergePresets: (incoming: Preset[]) => void;
};

const CounterContext = createContext<CounterContextValue | null>(null);

function pulse<T>(setter: (v: T | null) => void, value: T, ms = 180) {
  setter(value);
  window.setTimeout(() => setter(null), ms);
}

export function CounterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userDoc = useUserDoc();
  const saveCloudPresets = useSaveCloudPresets();
  const saveCloudSounds = useSaveCloudSounds();

  const [ready, setReady] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedId, setSelectedId] = useState("");
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
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(DEFAULT_SOUND);
  const [cloudHydrated, setCloudHydrated] = useState(false);

  const preset = presets.find((p) => p.id === selectedId) ?? presets[0];

  useEffect(() => {
    const local = ensurePresets(loadLocalPresets());
    setPresets(local);
    setSelectedId(local[0].id);
    setViewState(loadViewType());
    setKeyboardTypeState(loadKeyboardType());
    setSoundSettings(loadSoundSettings());
    const est = loadEstimateSettings();
    setFieldCountMax(est.fieldCountMax);
    setFieldCountKey(est.fieldCountKey);
    setEstimateCells(est.countedCells);
    setPrint(loadPrintSettings());
    setHistory(loadHistory());
    setReady(true);
    void preloadSounds();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsHandset(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!user || !userDoc.data || cloudHydrated) return;
    const data = userDoc.data;
    if (data.presets && data.presets.length > 0) {
      const live = data.presets.map(dbRowsToLive);
      setPresets(live);
      setSelectedId(live[0].id);
    } else {
      const local = loadLocalPresets();
      void saveCloudPresets.mutateAsync({ presets: local, includeEmail: true });
    }
    if (data.tableSettings?.soundSettings) {
      setSoundSettings(data.tableSettings.soundSettings);
    }
    setCloudHydrated(true);
  }, [user, userDoc.data, cloudHydrated, saveCloudPresets]);

  useEffect(() => {
    if (!user) setCloudHydrated(false);
  }, [user]);

  const updatePreset = useCallback(
    (updater: (current: Preset) => Preset, resetUndo = false) => {
      setPresets((list) =>
        list.map((p) => (p.id === selectedId ? updater(p) : p)),
      );
      if (resetUndo) setUndoStack([]);
    },
    [selectedId],
  );

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
          /* ignore */
        }
      } else if (outcome === "blocked") {
        playChannel("max", soundSettings);
        setShake(true);
        window.setTimeout(() => setShake(false), 350);
      }
    },
    [soundSettings],
  );

  const selectPreset = useCallback((id: string) => {
    setPresets((list) =>
      list.map((p) =>
        p.id === id ? { ...p, rows: p.rows.map((r) => ({ ...r, count: 0 })) } : p,
      ),
    );
    setSelectedId(id);
    setUndoStack([]);
    setMorphology(EMPTY_MORPHOLOGY);
  }, []);

  const saveNow = useCallback(async () => {
    const stripped = presets.map((p) => ({
      ...p,
      rows: p.rows.map((r) => ({ ...r, count: 0 })),
    }));
    saveLocalPresets(stripped);
    persistEstimate(estimateCells);
    await saveCloudPresets.mutateAsync({ presets: stripped });
  }, [presets, estimateCells, persistEstimate, saveCloudPresets]);

  const createPreset = useCallback((name: string, maxWBC: number) => {
    const next = blankPreset(name, maxWBC);
    setPresets((list) => [...list, next]);
    setSelectedId(next.id);
    setUndoStack([]);
  }, []);

  const deletePreset = useCallback(() => {
    setPresets((list) => {
      const next = ensurePresets(list.filter((p) => p.id !== selectedId));
      setSelectedId(next[0].id);
      return next;
    });
    setUndoStack([]);
  }, [selectedId]);

  const bumpRow = useCallback(
    (id: string, delta: 1 | -1) => {
      if (!preset) return;
      const result = applyDiffDelta(preset.rows, id, delta, preset.maxWBC);
      if (result.outcome === "ok") {
        updatePreset((p) => ({ ...p, rows: result.rows }));
        setUndoStack((s) => pushUndo(s, { kind: "diff", rowId: id, delta }));
      }
      const row = preset.rows.find((r) => r.id === id);
      feedback(result.outcome, id, row?.key);
    },
    [preset, updatePreset, feedback],
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
        setUndoStack((s) =>
          pushUndo(s, { kind: "estimate-cell", cellId: id, delta }),
        );
      }
      const cell = estimateCells.find((c) => c.id === id);
      feedback(result.outcome, id, cell?.key);
    },
    [estimateCells, fieldCount, fieldCountMax, increase, feedback],
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
    [fieldCount, fieldCountMax, fieldCountKey, feedback],
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
      if (!preset) return;
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
      view,
      fieldCountKey,
      bumpField,
      estimateCells,
      bumpEstimateCell,
      increase,
      preset,
      updatePreset,
      feedback,
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
          if (last.kind === "diff" && preset) {
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
  }, [handleKey, preset, updatePreset, fieldCount, fieldCountMax]);

  const bindRowKey = useCallback(
    (id: string, key: string) => {
      if (!preset) return false;
      const used = keysInUse(
        [...preset.rows, ...estimateCells.map((c) => ({ id: c.id, key: c.key }))],
        id,
      );
      if (used.has(key) || key === fieldCountKey) {
        pulse(setKeyErrorId, id, 1000);
        return false;
      }
      updatePreset((p) => ({
        ...p,
        rows: p.rows.map((r) => (r.id === id ? { ...r, key } : r)),
      }));
      return true;
    },
    [preset, estimateCells, fieldCountKey, updatePreset],
  );

  const bindEstimateKey = useCallback(
    (id: string | "field", key: string) => {
      const used = keysInUse(
        [...(preset?.rows ?? []), ...estimateCells],
        id === "field" ? undefined : id,
      );
      if (id === "field") {
        if (used.has(key)) {
          pulse(setKeyErrorId, "field", 1000);
          return false;
        }
        setFieldCountKey(key);
        persistEstimate(estimateCells, fieldCountMax, key);
        return true;
      }
      if ((used.has(key) && estimateCells.find((c) => c.id === id)?.key !== key) || key === fieldCountKey) {
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
    [preset, estimateCells, fieldCountKey, fieldCountMax, persistEstimate],
  );

  const clearSession = useCallback(() => {
    if (view === "estimate") {
      setEstimateCells((cells) => zeroEstimate(cells));
      setFieldCount(0);
    } else if (preset) {
      updatePreset((p) => ({ ...p, rows: clearRowCounts(p.rows) }));
    }
    setUndoStack([]);
  }, [view, preset, updatePreset]);

  const undo = useCallback(() => {
    const event = new KeyboardEvent("keydown", { key: "Backspace" });
    window.dispatchEvent(event);
  }, []);

  const saveCountToHistory = useCallback(() => {
    if (!preset) return;
    const stats = rowStats(preset.rows, wbcCount);
    const entry: HistoryEntry = {
      id: newId(),
      savedAt: Date.now(),
      presetName: preset.name,
      tally: tally(preset.rows),
      maxWBC: preset.maxWBC,
      wbcCount,
      correctedWbc: correctedWbc(preset.rows, wbcCount),
      anc: anc(preset.rows, wbcCount),
      alc: alc(preset.rows, wbcCount),
      meRatio: meRatio(preset.rows),
      rows: preset.rows.map((r) => ({
        cell: r.cell,
        count: r.count,
        ignore: r.ignore,
        nrbc: r.nrbc,
        relative: stats.get(r.id)?.relative ?? 0,
        absolute: stats.get(r.id)?.absolute ?? 0,
      })),
      morphology,
    };
    setHistory((list) => {
      const next = [entry, ...list].slice(0, HISTORY_CAP);
      saveHistory(next);
      return next;
    });
  }, [preset, wbcCount, morphology]);

  const stats = useMemo(
    () => rowStats(preset?.rows ?? [], wbcCount),
    [preset, wbcCount],
  );

  const value = useMemo<CounterContextValue>(() => {
    const current = preset ?? blankPreset();
    return {
      ready,
      saving: saveCloudPresets.isPending,
      presets,
      selectedId: current.id,
      preset: current,
      wbcCount,
      increase,
      view,
      keyboardType: isHandset ? "numpad" : keyboardType,
      isHandset,
      stats,
      tallyValue: tally(current.rows),
      corrected: correctedWbc(current.rows, wbcCount),
      ancValue: anc(current.rows, wbcCount),
      alcValue: alc(current.rows, wbcCount),
      me: meRatio(current.rows),
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
      selectPreset,
      saveNow,
      createPreset,
      deletePreset,
      renamePreset: (name) => updatePreset((p) => ({ ...p, name })),
      setMaxWBC: (n) => updatePreset((p) => ({ ...p, maxWBC: Math.max(1, Math.floor(n) || 1) })),
      updateRow: (id, patch) =>
        updatePreset((p) => ({
          ...p,
          rows: p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      addRow: () => {
        const id = newId();
        updatePreset((p) => ({
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
        }));
        return id;
      },
      removeRow: (id) =>
        updatePreset((p) => ({
          ...p,
          rows: p.rows.filter((r) => r.id !== id),
        })),
      reorderRows: (from, to) =>
        updatePreset((p) => {
          const rows = [...p.rows];
          const [moved] = rows.splice(from, 1);
          rows.splice(to, 0, moved);
          return { ...p, rows };
        }),
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
      deleteHistoryEntry: (id) => {
        setHistory((list) => {
          const next = list.filter((e) => e.id !== id);
          saveHistory(next);
          return next;
        });
      },
      clearHistory: () => {
        setHistory([]);
        saveHistory([]);
      },
      updateSounds: (next) => {
        setSoundSettings(next);
        saveSoundSettings(next);
        void saveCloudSounds.mutateAsync(next);
      },
      replacePresets: (next) => {
        const list = ensurePresets(next);
        setPresets(list);
        setSelectedId(list[0].id);
        setUndoStack([]);
        saveLocalPresets(list);
      },
      mergePresets: (incoming) => {
        setPresets((list) => {
          const next = ensurePresets([...list, ...incoming]);
          saveLocalPresets(next);
          return next;
        });
      },
    };
  }, [
    ready,
    saveCloudPresets.isPending,
    presets,
    preset,
    wbcCount,
    increase,
    view,
    keyboardType,
    isHandset,
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
    selectPreset,
    saveNow,
    createPreset,
    deletePreset,
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
    saveCloudSounds,
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
