import { createContext } from "react";
import type { CounterSoundsValue } from "@/features/counter/context/counterTypes";

export const CounterSoundsContext = createContext<CounterSoundsValue | null>(null);
