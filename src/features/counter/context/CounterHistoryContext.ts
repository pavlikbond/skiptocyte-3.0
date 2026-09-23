import { createContext } from "react";
import type { CounterHistoryValue } from "@/features/counter/context/counterTypes";

export const CounterHistoryContext = createContext<CounterHistoryValue | null>(null);
