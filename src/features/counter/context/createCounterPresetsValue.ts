import type {
  CounterContextValue,
  CounterPresetsValue,
} from "@/features/counter/context/counterTypes";

export function createCounterPresetsValue(
  value: CounterContextValue,
): CounterPresetsValue {
  return {
    saving: value.saving,
    presets: value.presets,
    setupSource: value.setupSource,
    applySavedPreset: value.applySavedPreset,
    saveCurrentAsPreset: value.saveCurrentAsPreset,
    updateSavedPreset: value.updateSavedPreset,
    renameSavedPreset: value.renameSavedPreset,
    deleteSavedPreset: value.deleteSavedPreset,
    replacePresets: value.replacePresets,
    mergePresets: value.mergePresets,
  };
}
