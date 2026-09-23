import type {
  CounterContextValue,
  CounterHistoryValue,
} from "@/features/counter/context/counterTypes";

export function createCounterHistoryValue(
  value: CounterContextValue,
): CounterHistoryValue {
  return {
    ready: value.ready,
    history: value.history,
    saveCountToHistory: value.saveCountToHistory,
    loadHistoryEntry: value.loadHistoryEntry,
    renameHistoryEntry: value.renameHistoryEntry,
    deleteHistoryEntry: value.deleteHistoryEntry,
    clearHistory: value.clearHistory,
  };
}
