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
  name: z.string().min(1),
  maxWBC: z.number().int().min(1),
  rows: z.array(dbRowSchema),
});

export const presetFileSchema = z.object({
  presets: z.array(dbPresetSchema).min(1),
});

export type PresetFile = z.infer<typeof presetFileSchema>;
