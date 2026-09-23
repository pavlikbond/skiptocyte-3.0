import { createContext } from "react";
import type { CounterPresetsValue } from "@/features/counter/context/counterTypes";

export const CounterPresetsContext = createContext<CounterPresetsValue | null>(null);
