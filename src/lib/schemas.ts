import { z } from "zod";

export const lineageSchema = z.enum(["myeloid", "erythroid", "none"]);

export const dbRowSchema = z.object({
  ignore: z.boolean(),
  key: z.union([z.string(), z.number()]),
  cell: z.string().max(25),
  nrbc: z.boolean().optional(),
  lineage: lineageSchema.optional(),
});

export const dbPresetSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  maxWBC: z.number().int().min(1),
  rows: z.array(dbRowSchema),
});

/** Current preset exchange format. Bump this when the file shape changes. */
export const PRESET_FILE_VERSION = 1 as const;

/**
 * Version 1 exchange file. Add `presetFileV2Schema` (and a branch in
 * `parsePresetFile`) when a later format needs to be read alongside this one.
 */
export const presetFileV1Schema = z.object({
  version: z.literal(PRESET_FILE_VERSION),
  presets: z.array(dbPresetSchema),
});

/** Files saved before a version field existed. Read as version 1. */
export const presetFileLegacySchema = z.object({
  presets: z.array(dbPresetSchema),
});

export const presetFileSchema = presetFileV1Schema;

export type PresetFileV1 = z.infer<typeof presetFileV1Schema>;
export type PresetFile = PresetFileV1;

export const PRESET_FILE_INVALID_MESSAGE = "That file is not a valid preset list.";

export function unsupportedPresetFileMessage(version: number) {
  return `This file uses preset format version ${version}, which this version of Skiptocyte cannot read.`;
}

export type ParsedPresetFile =
  | { ok: true; file: PresetFileV1 }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Accepts the current versioned file and the original unversioned `{ presets }`
 * export. Unknown integer versions fail with a message that names the version
 * so a future reader can add a schema without breaking this one.
 */
export function parsePresetFile(input: unknown): ParsedPresetFile {
  if (!isRecord(input)) {
    return { ok: false, message: PRESET_FILE_INVALID_MESSAGE };
  }

  if (!("version" in input)) {
    const legacy = presetFileLegacySchema.safeParse(input);
    if (!legacy.success) {
      return { ok: false, message: PRESET_FILE_INVALID_MESSAGE };
    }
    return { ok: true, file: { version: PRESET_FILE_VERSION, presets: legacy.data.presets } };
  }

  if (input.version === PRESET_FILE_VERSION) {
    const parsed = presetFileV1Schema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: PRESET_FILE_INVALID_MESSAGE };
    }
    return { ok: true, file: parsed.data };
  }

  if (typeof input.version === "number" && Number.isInteger(input.version)) {
    return { ok: false, message: unsupportedPresetFileMessage(input.version) };
  }

  return { ok: false, message: PRESET_FILE_INVALID_MESSAGE };
}

/** Builds a versioned file and rejects anything the current schema will not accept. */
export function buildPresetFile(presets: z.infer<typeof dbPresetSchema>[]): PresetFileV1 {
  return presetFileV1Schema.parse({
    version: PRESET_FILE_VERSION,
    presets,
  });
}
