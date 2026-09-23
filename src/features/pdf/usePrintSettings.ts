import { useCallback, useState } from "react";
import { loadPrintSettings, savePrintSettings } from "@/lib/storage";
import type { PrintSettings } from "@/lib/types";

export function usePrintSettings() {
  const [print, setPrint] = useState<PrintSettings>(loadPrintSettings);

  const persistPrint = useCallback(() => {
    savePrintSettings(print);
  }, [print]);

  const restorePrint = useCallback(() => {
    setPrint(loadPrintSettings());
  }, []);

  return {
    print,
    setPrint,
    persistPrint,
    restorePrint,
  };
}
