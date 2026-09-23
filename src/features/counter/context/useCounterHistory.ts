import { useContext } from "react";
import { CounterHistoryContext } from "@/features/counter/context/CounterHistoryContext";

export function useCounterHistory() {
  const ctx = useContext(CounterHistoryContext);
  if (!ctx) throw new Error("useCounterHistory must be used within CounterProvider");
  return ctx;
}
