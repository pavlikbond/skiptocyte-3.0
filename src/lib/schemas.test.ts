import { describe, expect, it } from "vitest";
import {
  PRESET_FILE_INVALID_MESSAGE,
  PRESET_FILE_VERSION,
  buildPresetFile,
  parsePresetFile,
  unsupportedPresetFileMessage,
} from "./schemas";

const neutrophil = {
  ignore: false,
  key: "5",
  cell: "Neutrophil",
  nrbc: false,
  lineage: "none" as const,
};

const validPreset = {
  id: "preset-1",
  name: "5 Part",
  maxWBC: 100,
  rows: [neutrophil],
};

describe("parsePresetFile", () => {
  it("accepts the current version and keeps the version number", () => {
    const file = buildPresetFile([validPreset]);
    expect(file.version).toBe(PRESET_FILE_VERSION);

    const parsed = parsePresetFile(file);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.version).toBe(1);
    expect(parsed.file.presets).toEqual([validPreset]);
  });

  it("reads unversioned exports as version 1", () => {
    const parsed = parsePresetFile({ presets: [validPreset] });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file).toEqual({ version: 1, presets: [validPreset] });
  });

  it("names an unsupported future version so another schema can be added later", () => {
    const parsed = parsePresetFile({ version: 2, presets: [validPreset] });
    expect(parsed).toEqual({
      ok: false,
      message: unsupportedPresetFileMessage(2),
    });
  });

  it("rejects a file that is not a preset list", () => {
    expect(parsePresetFile(null)).toEqual({
      ok: false,
      message: PRESET_FILE_INVALID_MESSAGE,
    });
    expect(parsePresetFile({ version: 1, presets: [{ name: "" }] })).toEqual({
      ok: false,
      message: PRESET_FILE_INVALID_MESSAGE,
    });
    expect(parsePresetFile({ version: "1", presets: [] })).toEqual({
      ok: false,
      message: PRESET_FILE_INVALID_MESSAGE,
    });
  });

  it("accepts an empty preset list on the current version", () => {
    const parsed = parsePresetFile(buildPresetFile([]));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.presets).toEqual([]);
  });

  it("rejects a preset the current schema does not allow", () => {
    expect(() =>
      buildPresetFile([{ name: "Panel", maxWBC: 0, rows: [] }]),
    ).toThrow();
  });
});
