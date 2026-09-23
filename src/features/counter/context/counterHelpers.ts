import type { Preset } from "@/lib/types";
import { newId } from "@/lib/utils";

export function pulse<T>(setter: (v: T | null) => void, value: T, ms = 180) {
  setter(value);
  window.setTimeout(() => setter(null), ms);
}

export function clonePresetForSession(source: Preset): Preset {
  return {
    id: newId(),
    name: source.name,
    maxWBC: source.maxWBC,
    rows: source.rows.map((row) => ({
      ...row,
      id: newId(),
      count: 0,
    })),
  };
}

export function dedupePresetIds(list: Preset[]): Preset[] {
  const seen = new Set<string>();
  return list.map((preset) => {
    if (!preset.id || seen.has(preset.id)) {
      return { ...preset, id: newId() };
    }
    seen.add(preset.id);
    return preset;
  });
}
