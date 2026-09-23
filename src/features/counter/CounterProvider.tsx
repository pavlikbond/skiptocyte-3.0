import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useSaveCloudPresets,
  useSaveCloudSounds,
  useUserDoc,
} from "@/features/presets/useUserDoc";
import { CounterHistoryContext } from "@/features/counter/context/CounterHistoryContext";
import { CounterPresetsContext } from "@/features/counter/context/CounterPresetsContext";
import { CounterSessionContext } from "@/features/counter/context/CounterSessionContext";
import { CounterSoundsContext } from "@/features/counter/context/CounterSoundsContext";
import {
  clonePresetForSession,
  dedupePresetIds,
  pulse,
} from "@/features/counter/context/counterHelpers";
import type {
  CaptureTarget,
  CounterContextValue,
} from "@/features/counter/context/counterTypes";
import { createCounterHistoryValue } from "@/features/counter/context/createCounterHistoryValue";
import { createCounterPresetsValue } from "@/features/counter/context/createCounterPresetsValue";
import { createCounterSessionValue } from "@/features/counter/context/createCounterSessionValue";
import { createCounterSoundsValue } from "@/features/counter/context/createCounterSoundsValue";
import {
  playChannel,
  preloadSounds,
  resumeAudio,
} from "@/features/sounds/soundEngine";
import {
  alc,
  anc,
  assignKey,
  anyCounts,
  applyDiffDelta,
  applyDiffKey,
  applyEstimateCellDelta,
  applyFieldDelta,
  clearRowCounts,
  correctedWbc,
  meRatio,
  pushUndo,
  rowStats,
  stripCountsForSave,
  tally,
  zeroEstimate,
} from "@/lib/counting";
import { applyUndo } from "@/features/counter/counterSession";
import { normalizeKey } from "@/lib/keys";
import { blankPreset } from "@/lib/presets";
import {
  defaultCurrentSetup,
  dbRowsToLive,
  loadCurrentSetup,
  loadEstimateSettings,
  loadHistory,
  loadKeyboardType,
  loadLocalPresets,
  loadSoundSettings,
  saveCurrentSetup,
  saveEstimateSettings,
  saveHistory,
  saveKeyboardType,
  saveLocalPresets,
  saveSoundSettings,
  saveViewType,
  loadViewType,
} from "@/lib/storage";
import { historyLabel, presetFromHistory } from "@/lib/history";
import type {
  EstimateCell,
  HistoryEntry,
  KeyboardType,
  Lineage,
  MorphologyState,
  Preset,
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
  const [capture, setCapture] = useState<CaptureTarget>(null);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [morphology, setMorphology] = useState<MorphologyState>(EMPTY_MORPHOLOGY);
  const [fieldCount, setFieldCount] = useState(0);
  const [fieldCountMax, setFieldCountMax] = useState(10);
  const [fieldCountKey, setFieldCountKey] = useState("1");
  const [estimateCells, setEstimateCells] = useState<EstimateCell[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyUid, setHistoryUid] = useState<string | null | undefined>(undefined);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(DEFAULT_SOUND);
  const [runtimeActive, setRuntimeActive] = useState(false);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const captureNoticeTimerRef = useRef<number | null>(null);
  const suppressRepeatCodeRef = useRef<string | null>(null);

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
      setCapture(null);
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
    setCapture(null);
    setCaptureNotice(null);
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

  useEffect(
    () => () => {
      if (captureNoticeTimerRef.current != null) {
        window.clearTimeout(captureNoticeTimerRef.current);
      }
    },
    [],
  );

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

  const showCaptureNotice = useCallback((message: string, ms: number) => {
    setCaptureNotice(message);
    if (captureNoticeTimerRef.current != null) {
      window.clearTimeout(captureNoticeTimerRef.current);
    }
    captureNoticeTimerRef.current = window.setTimeout(() => {
      setCaptureNotice(null);
      captureNoticeTimerRef.current = null;
    }, ms);
  }, []);

  const cancelCapture = useCallback(() => {
    setCapture(null);
  }, []);

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

  const bindRowKey = useCallback(
    (id: string, key: string) => {
      const result = assignKey(preset.rows, id, key);
      if (result.items === preset.rows) return { ok: false, swappedWith: null };
      updatePreset(
        (p) => ({
          ...p,
          rows: result.items,
        }),
        { persistStructure: true },
      );
      return { ok: true, swappedWith: result.swappedWith?.id ?? null };
    },
    [preset.rows, updatePreset],
  );

  const bindEstimateKey = useCallback(
    (id: string | "field", key: string) => {
      if (id === "field") {
        const currentKey = fieldCountKey;
        if (currentKey === key) return { ok: true, swappedWith: null };
        const swappedCell = key
          ? estimateCells.find((cell) => cell.key && cell.key === key)
          : undefined;
        const nextFieldKey = key;
        const nextCells = swappedCell
          ? estimateCells.map((cell) =>
              cell.id === swappedCell.id ? { ...cell, key: currentKey } : cell,
            )
          : estimateCells;
        setFieldCountKey(nextFieldKey);
        if (swappedCell) {
          setEstimateCells(nextCells);
        }
        persistEstimate(nextCells, fieldCountMax, nextFieldKey);
        return { ok: true, swappedWith: swappedCell?.id ?? null };
      }
      const current = estimateCells.find((cell) => cell.id === id);
      if (!current) return { ok: false, swappedWith: null };
      if (current.key === key) return { ok: true, swappedWith: null };

      if (key === fieldCountKey) {
        const nextCells = estimateCells.map((cell) =>
          cell.id === id ? { ...cell, key } : cell,
        );
        const nextFieldKey = current.key;
        setFieldCountKey(nextFieldKey);
        setEstimateCells(nextCells);
        persistEstimate(nextCells, fieldCountMax, nextFieldKey);
        return { ok: true, swappedWith: "field" };
      }

      const result = assignKey(estimateCells, id, key);
      setEstimateCells(result.items);
      persistEstimate(result.items);
      return { ok: true, swappedWith: result.swappedWith?.id ?? null };
    },
    [estimateCells, fieldCountKey, fieldCountMax, persistEstimate],
  );

  const captureLabel = useMemo(() => {
    if (!capture) return null;
    if (view === "estimate") {
      if (capture.id === "field") return "field count";
      return estimateCells.find((cell) => cell.id === capture.id)?.name || "cell";
    }
    return preset.rows.find((row) => row.id === capture.id)?.cell || "cell";
  }, [capture, estimateCells, preset.rows, view]);

  const startCapture = useCallback((id: string) => {
    setCapture({ id });
    setCaptureNotice(null);
  }, []);

  const captureKey = useCallback(
    (key: string | null) => {
      if (!capture) return false;
      if (key == null) {
        pulse(setKeyErrorId, capture.id, 350);
        showCaptureNotice("That key can't be used here", 1600);
        return false;
      }

      const targetId = capture.id;
      if (view === "estimate") {
        const currentKey =
          targetId === "field"
            ? fieldCountKey
            : (estimateCells.find((cell) => cell.id === targetId)?.key ?? "");
        if (currentKey === key) {
          setCapture(null);
          return false;
        }
        const bindResult = bindEstimateKey(targetId === "field" ? "field" : targetId, key);
        if (!bindResult.ok) return false;

        setCapture(null);
        setFlashKey(key);
        if (targetId !== "field") {
          setFlashRowId(targetId);
          setFlashTick((n) => n + 1);
        }
        if (bindResult.swappedWith) {
          const swappedName =
            bindResult.swappedWith === "field"
              ? "field count"
              : estimateCells.find((cell) => cell.id === bindResult.swappedWith)?.name || "cell";
          showCaptureNotice(`Swapped with ${swappedName}`, 2000);
        }
        return true;
      }

      const row = preset.rows.find((item) => item.id === targetId);
      if (!row) {
        setCapture(null);
        return false;
      }
      if (row.key === key) {
        setCapture(null);
        return false;
      }
      const bindResult = bindRowKey(targetId, key);
      if (!bindResult.ok) return false;
      setCapture(null);
      setFlashKey(key);
      setFlashRowId(targetId);
      setFlashTick((n) => n + 1);
      if (bindResult.swappedWith) {
        const swappedName =
          preset.rows.find((item) => item.id === bindResult.swappedWith)?.cell || "cell";
        showCaptureNotice(`Swapped with ${swappedName}`, 2000);
      }
      return true;
    },
    [
      bindEstimateKey,
      bindRowKey,
      capture,
      estimateCells,
      fieldCountKey,
      preset.rows,
      showCaptureNotice,
      view,
    ],
  );

  const applyUndoFromStack = useCallback(() => {
    setUndoStack((stack) => {
      const result = applyUndo({
        rows: preset.rows,
        maxWBC: preset.maxWBC,
        estimateCells,
        fieldCount,
        fieldCountMax,
        undoStack: stack,
      });
      if (!result.changed) return stack;
      if (result.rows !== preset.rows) {
        updatePreset((p) => ({ ...p, rows: result.rows }));
      }
      if (result.estimateCells !== estimateCells) {
        setEstimateCells(result.estimateCells);
      }
      if (result.fieldCount !== fieldCount) {
        setFieldCount(result.fieldCount);
      }
      return result.undoStack;
    });
  }, [estimateCells, fieldCount, fieldCountMax, preset.maxWBC, preset.rows, updatePreset]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!runtimeActive) return;
      if (capture) {
        if (event.key === "Tab") {
          cancelCapture();
          return;
        }
        event.preventDefault();
        if (event.key === "Escape") {
          cancelCapture();
          return;
        }
        if (event.key === "Backspace" || event.key === "Delete") {
          captureKey("");
          return;
        }
        const handled = captureKey(normalizeKey(event));
        if (handled) {
          suppressRepeatCodeRef.current = event.code || event.key;
        }
        return;
      }

      if (
        suppressRepeatCodeRef.current &&
        (event.code === suppressRepeatCodeRef.current || event.key === suppressRepeatCodeRef.current) &&
        event.repeat
      ) {
        event.preventDefault();
        return;
      }

      if (isEditableTarget(event.target)) return;
      if (event.key === "Backspace" || (event.ctrlKey && event.key.toLowerCase() === "z")) {
        event.preventDefault();
        applyUndoFromStack();
        return;
      }
      const key = normalizeKey(event);
      if (!key) return;
      handleKey(key);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (
        suppressRepeatCodeRef.current &&
        (event.code === suppressRepeatCodeRef.current || event.key === suppressRepeatCodeRef.current)
      ) {
        suppressRepeatCodeRef.current = null;
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    cancelCapture,
    capture,
    captureKey,
    handleKey,
    applyUndoFromStack,
    runtimeActive,
  ]);

  useEffect(() => {
    if (!capture) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-capture-zone]")) return;
      cancelCapture();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [cancelCapture, capture]);

  useEffect(() => {
    if (!capture) return;
    if (view === "estimate") {
      if (capture.id === "field") return;
      if (estimateCells.some((cell) => cell.id === capture.id)) return;
      cancelCapture();
      return;
    }
    if (preset.rows.some((row) => row.id === capture.id)) return;
    cancelCapture();
  }, [cancelCapture, capture, estimateCells, preset.rows, view]);

  const clearSession = useCallback(() => {
    if (view === "estimate") {
      setEstimateCells((cells) => zeroEstimate(cells));
      setFieldCount(0);
    } else {
      updatePreset((p) => ({ ...p, rows: clearRowCounts(p.rows) }));
    }
    setCapture(null);
    setUndoStack([]);
  }, [updatePreset, view]);

  const undo = useCallback(() => {
    applyUndoFromStack();
  }, [applyUndoFromStack]);

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
      setCapture(null);
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
      label: "",
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

  const renameHistoryEntry = useCallback((id: string, label: string) => {
    if (authLoading) return;
    const nextLabel = historyLabel(label);
    setHistory((list) => {
      const next = list.map((entry) =>
        entry.id === id ? { ...entry, label: nextLabel } : entry,
      );
      saveHistory(next, uid);
      return next;
    });
  }, [authLoading, uid]);

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
    capture,
    captureLabel,
    captureNotice,
    morphology,
    estimate: {
      fieldCount,
      fieldCountMax,
      fieldCountKey,
      cells: estimateCells,
    },
    history,
    soundSettings,
    setWbcCount,
    setIncrease,
    setView: (v) => {
      setCapture(null);
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
    startCapture,
    cancelCapture,
    captureKey,
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
    saveCountToHistory,
    loadHistoryEntry,
    renameHistoryEntry,
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
    setRuntimeActive,
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
    capture,
    captureLabel,
    captureNotice,
    morphology,
    fieldCount,
    fieldCountMax,
    fieldCountKey,
    estimateCells,
    history,
    soundSettings,
    applySavedPreset,
    saveCurrentAsPreset,
    updateSavedPreset,
    renameSavedPreset,
    deleteSavedPreset,
    updatePreset,
    bindRowKey,
    startCapture,
    cancelCapture,
    captureKey,
    clearSession,
    undo,
    bumpRow,
    persistEstimate,
    bindEstimateKey,
    bumpEstimateCell,
    bumpField,
    saveCountToHistory,
    loadHistoryEntry,
    renameHistoryEntry,
    authLoading,
    uid,
    saveCloudSounds,
    persistSavedPresets,
    persistCurrent,
    setRuntimeActive,
  ]);

  const sessionValue = useMemo(() => createCounterSessionValue(value), [value]);
  const presetsValue = useMemo(() => createCounterPresetsValue(value), [value]);
  const historyValue = useMemo(() => createCounterHistoryValue(value), [value]);
  const soundsValue = useMemo(() => createCounterSoundsValue(value), [value]);

  return (
    <CounterSessionContext.Provider value={sessionValue}>
      <CounterPresetsContext.Provider value={presetsValue}>
        <CounterHistoryContext.Provider value={historyValue}>
          <CounterSoundsContext.Provider value={soundsValue}>
            {children}
          </CounterSoundsContext.Provider>
        </CounterHistoryContext.Provider>
      </CounterPresetsContext.Provider>
    </CounterSessionContext.Provider>
  );
}
