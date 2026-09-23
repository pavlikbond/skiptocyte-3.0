import { useContext } from "react";
import { CounterPresetsContext } from "@/features/counter/context/CounterPresetsContext";

export function useCounterPresets() {
  const ctx = useContext(CounterPresetsContext);
  if (!ctx) throw new Error("useCounterPresets must be used within CounterProvider");
  return ctx;
}
