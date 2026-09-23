import { useContext } from "react";
import { CounterSoundsContext } from "@/features/counter/context/CounterSoundsContext";

export function useCounterSounds() {
  const ctx = useContext(CounterSoundsContext);
  if (!ctx) throw new Error("useCounterSounds must be used within CounterProvider");
  return ctx;
}
