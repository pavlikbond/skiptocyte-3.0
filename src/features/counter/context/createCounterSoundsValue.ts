import type {
  CounterContextValue,
  CounterSoundsValue,
} from "@/features/counter/context/counterTypes";

export function createCounterSoundsValue(
  value: CounterContextValue,
): CounterSoundsValue {
  return {
    soundSettings: value.soundSettings,
    updateSounds: value.updateSounds,
  };
}
