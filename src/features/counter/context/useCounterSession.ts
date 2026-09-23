import { useContext } from "react";
import { CounterSessionContext } from "@/features/counter/context/CounterSessionContext";

export function useCounterSession() {
  const ctx = useContext(CounterSessionContext);
  if (!ctx) throw new Error("useCounterSession must be used within CounterProvider");
  return ctx;
}
