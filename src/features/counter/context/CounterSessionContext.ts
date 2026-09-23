import { createContext } from "react";
import type { CounterSessionValue } from "@/features/counter/context/counterTypes";

export const CounterSessionContext = createContext<CounterSessionValue | null>(null);
