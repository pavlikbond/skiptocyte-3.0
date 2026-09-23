import { useRef, useState, type ReactNode } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCounterPresets } from "@/features/counter/context/useCounterPresets";
import { dbRowsToLive, liveToDb } from "@/lib/storage";
import { buildPresetFile, parsePresetFile } from "@/lib/schemas";
import type { Preset } from "@/lib/types";

export type PresetExchangeStep = "list" | "export" | "import";

function safeFilename(name: string) {
  return (
    name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ") || "presets"
  );
}

function downloadPresetFile(presets: Preset[]) {
  const file = buildPresetFile(liveToDb(presets));
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    presets.length === 1
      ? `skiptocyte-${safeFilename(presets[0].name)}.json`
      : "skiptocyte-presets.json";
  a.click();
  URL.revokeObjectURL(url);
}

function cellCountLabel(count: number) {
  return count === 1 ? "1 cell" : `${count} cells`;
}

function PresetChecklist({
  presets,
  selected,
  onSelectedChange,
  inputPrefix,
}: {
  presets: Preset[];
  selected: ReadonlySet<string>;
  onSelectedChange: (next: Set<string>) => void;
  inputPrefix: string;
}) {
  const selectedCount = presets.filter((preset) => selected.has(preset.id)).length;
  const allChecked = presets.length > 0 && selectedCount === presets.length;
  const checkedState: boolean | "indeterminate" = allChecked
    ? true
    : selectedCount > 0
      ? "indeterminate"
      : false;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-3 border-b border-border bg-muted px-3 py-2.5">
        <Checkbox
          id={`${inputPrefix}-all`}
          checked={checkedState}
          onCheckedChange={(value) => {
            onSelectedChange(
              value === true ? new Set(presets.map((preset) => preset.id)) : new Set(),
            );
          }}
          aria-label="Select all presets"
        />
        <label
          htmlFor={`${inputPrefix}-all`}
          className="flex min-w-0 flex-1 cursor-pointer items-baseline justify-between gap-3"
        >
          <span className="text-sm font-medium">Select all</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {selectedCount} of {presets.length}
          </span>
        </label>
      </div>
      <div className="divide-y divide-border">
        {presets.map((preset) => {
          const inputId = `${inputPrefix}-${preset.id}`;
          return (
            <div key={preset.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40">
              <Checkbox
                id={inputId}
                checked={selected.has(preset.id)}
                onCheckedChange={(value) => {
                  const next = new Set(selected);
                  if (value === true) next.add(preset.id);
                  else next.delete(preset.id);
                  onSelectedChange(next);
                }}
                aria-label={preset.name}
              />
              <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
                <span className="block truncate text-sm font-medium">{preset.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {cellCountLabel(preset.rows.length)} · limit {preset.maxWBC}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
      {children}
    </div>
  );
}

export function ImportExport({
  step,
  onStepChange,
  children,
}: {
  step: PresetExchangeStep;
  onStepChange: (step: PresetExchangeStep) => void;
  children: ReactNode;
}) {
  const ctx = useCounterPresets();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportIds, setExportIds] = useState<Set<string>>(new Set());
  const [importCandidates, setImportCandidates] = useState<Preset[] | null>(null);
  const [importIds, setImportIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<"add" | "replace" | null>(null);

  const openExport = () => {
    setError(null);
    setExportIds(new Set(ctx.presets.map((preset) => preset.id)));
    onStepChange("export");
  };

  const exportSelected = () => {
    const chosen = ctx.presets.filter((preset) => exportIds.has(preset.id));
    if (chosen.length === 0) return;
    try {
      downloadPresetFile(chosen);
      onStepChange("list");
    } catch {
      setError("Those presets could not be exported. Check that each one has a name.");
    }
  };

  const onFile = async (file: File) => {
    setError(null);
    try {
      const parsed = parsePresetFile(JSON.parse(await file.text()));
      if (!parsed.ok) {
        setError(parsed.message);
        onStepChange("list");
        return;
      }
      const live = parsed.file.presets.map(dbRowsToLive);
      setImportCandidates(live);
      setImportIds(new Set(live.map((preset) => preset.id)));
      onStepChange("import");
    } catch {
      setError("That file is not a valid preset list.");
      onStepChange("list");
    }
  };

  const commitImport = async (mode: "add" | "replace") => {
    if (!importCandidates) return;
    const chosen = importCandidates.filter((preset) => importIds.has(preset.id));
    if (chosen.length === 0) return;
    setImporting(mode);
    try {
      if (mode === "add") await ctx.mergePresets(chosen);
      else await ctx.replacePresets(chosen);
      setImportCandidates(null);
      onStepChange("list");
    } finally {
      setImporting(null);
    }
  };

  const exportCount = ctx.presets.filter((preset) => exportIds.has(preset.id)).length;
  const importCount =
    importCandidates?.filter((preset) => importIds.has(preset.id)).length ?? 0;

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="application/json,.json"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void onFile(file);
        e.target.value = "";
      }}
    />
  );

  if (step === "export") {
    return (
      <>
        {fileInput}
        <DialogHeader>
          <DialogTitle>Export presets</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose which presets to include in the file.
          </p>
        </DialogHeader>
        {ctx.presets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-5">
            <p className="text-sm font-medium">No presets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save a setup first, then export the ones you want to keep.
            </p>
          </div>
        ) : (
          <PresetChecklist
            presets={ctx.presets}
            selected={exportIds}
            onSelectedChange={setExportIds}
            inputPrefix="export-preset"
          />
        )}
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <StepFooter>
          <Button variant="outline" onClick={() => onStepChange("list")}>
            Cancel
          </Button>
          <Button onClick={exportSelected} disabled={exportCount === 0}>
            {exportCount === 0
              ? "Export presets"
              : exportCount === 1
                ? "Export 1 preset"
                : `Export ${exportCount} presets`}
          </Button>
        </StepFooter>
      </>
    );
  }

  if (step === "import") {
    return (
      <>
        {fileInput}
        <DialogHeader>
          <DialogTitle>Import presets</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add keeps your current presets. Replace library removes them.
          </p>
        </DialogHeader>
        {importCandidates && importCandidates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-5">
            <p className="text-sm font-medium">No presets in this file</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The file is valid, but it does not contain any presets.
            </p>
          </div>
        ) : importCandidates ? (
          <PresetChecklist
            presets={importCandidates}
            selected={importIds}
            onSelectedChange={setImportIds}
            inputPrefix="import-preset"
          />
        ) : null}
        <StepFooter>
          <Button
            variant="outline"
            onClick={() => {
              setImportCandidates(null);
              onStepChange("list");
            }}
            disabled={importing != null}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={importCount === 0 || importing != null}
            onClick={() => void commitImport("replace")}
          >
            {importing === "replace" ? "Replacing…" : "Replace library"}
          </Button>
          <Button
            disabled={importCount === 0 || importing != null}
            onClick={() => void commitImport("add")}
          >
            {importing === "add"
              ? "Adding…"
              : importCount === 0
                ? "Add presets"
                : importCount === 1
                  ? "Add 1 preset"
                  : `Add ${importCount} presets`}
          </Button>
        </StepFooter>
      </>
    );
  }

  return (
    <>
      {fileInput}
      {children}
      <div className="mt-5 space-y-3 border-t border-border pt-4">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openExport} disabled={ctx.presets.length === 0}>
            <Download />
            Export presets
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload />
            Import presets
          </Button>
        </div>
      </div>
    </>
  );
}
