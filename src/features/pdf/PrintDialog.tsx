import { Download, Loader2, Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useCounterSession } from "@/features/counter/context/useCounterSession";
import { reportRowsFromHistory } from "@/lib/history";
import type { HistoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePrintSettings } from "@/features/pdf/usePrintSettings";

const DIFF_TOGGLES = [
  ["showCell", "Cell"],
  ["showCount", "Count"],
  ["showRelative", "Relative"],
  ["showAbsolute", "Absolute"],
  ["showUnits", "Units"],
  ["showIgnored", "Ignored rows"],
  ["showWBC", "WBC"],
  ["showMorphology", "Morphology"],
] as const;

const ESTIMATE_TOGGLES = [["showUnits", "Units"]] as const;

export function PrintDialog({
  snapshot = null,
  open: openProp,
  onOpenChange,
}: {
  snapshot?: HistoryEntry | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const session = useCounterSession();
  const { print: p, setPrint, persistPrint, restorePrint } = usePrintSettings();
  const { toast } = useToast();
  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? openProp : uncontrolledOpen;
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<"download" | "print" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const skipRestore = useRef(false);
  const busy = working !== null;
  const view = snapshot ? "standard" : session.view;
  const toggles = view === "estimate" ? ESTIMATE_TOGGLES : DIFF_TOGGLES;
  const snapshotRows = useMemo(
    () => (snapshot ? reportRowsFromHistory(snapshot) : null),
    [snapshot],
  );

  useEffect(() => {
    if (!open) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewError(false);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(false);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const { renderDiffBlob, renderEstimateBlob } = await import(
            "@/features/pdf/reports"
          );
          const blob =
            view === "estimate"
              ? await renderEstimateBlob({
                  print: p,
                  fieldCount: session.estimate.fieldCount,
                  fieldCountMax: session.estimate.fieldCountMax,
                  cells: session.estimate.cells,
                })
              : await renderDiffBlob(
                  snapshot && snapshotRows
                    ? {
                        print: p,
                        rows: snapshotRows.rows,
                        stats: snapshotRows.stats,
                        wbcCount: snapshot.wbcCount,
                        corrected: snapshot.correctedWbc,
                        ancValue: snapshot.anc,
                        alcValue: snapshot.alc,
                        me: snapshot.meRatio,
                        morphology: snapshot.morphology,
                      }
                    : {
                        print: p,
                        rows: session.preset.rows,
                        stats: session.stats,
                        wbcCount: session.wbcCount,
                        corrected: session.corrected,
                        ancValue: session.ancValue,
                        alcValue: session.alcValue,
                        me: session.me,
                        morphology: session.morphology,
                      },
                );
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } catch {
          if (!cancelled) {
            setPreviewError(true);
            setPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          }
        } finally {
          if (!cancelled) setPreviewLoading(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    open,
    view,
    p,
    snapshot,
    snapshotRows,
    session.preset.rows,
    session.stats,
    session.wbcCount,
    session.corrected,
    session.ancValue,
    session.alcValue,
    session.me,
    session.morphology,
    session.estimate.fieldCount,
    session.estimate.fieldCountMax,
    session.estimate.cells,
  ]);

  function handleOpenChange(next: boolean) {
    if (busy && !next) return;
    if (!next && !skipRestore.current) restorePrint();
    skipRestore.current = false;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  async function handleSave() {
    if (saving || busy) return;
    setSaving(true);
    persistPrint();
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setSaving(false);
    toast("Settings saved");
  }

  async function renderReportBlob() {
    const { renderDiffBlob, renderEstimateBlob } = await import(
      "@/features/pdf/reports"
    );
    if (view === "estimate") {
      return renderEstimateBlob({
        print: p,
        fieldCount: session.estimate.fieldCount,
        fieldCountMax: session.estimate.fieldCountMax,
        cells: session.estimate.cells,
      });
    }
    if (snapshot && snapshotRows) {
      return renderDiffBlob({
        print: p,
        rows: snapshotRows.rows,
        stats: snapshotRows.stats,
        wbcCount: snapshot.wbcCount,
        corrected: snapshot.correctedWbc,
        ancValue: snapshot.anc,
        alcValue: snapshot.alc,
        me: snapshot.meRatio,
        morphology: snapshot.morphology,
      });
    }
    return renderDiffBlob({
      print: p,
      rows: session.preset.rows,
      stats: session.stats,
      wbcCount: session.wbcCount,
      corrected: session.corrected,
      ancValue: session.ancValue,
      alcValue: session.alcValue,
      me: session.me,
      morphology: session.morphology,
    });
  }

  function finishReport() {
    persistPrint();
    skipRestore.current = true;
    setWorking(null);
    if (!isControlled) setUncontrolledOpen(false);
    onOpenChange?.(false);
  }

  async function handleDownload() {
    if (busy || saving) return;
    setWorking("download");
    try {
      const blob = await renderReportBlob();
      const filename = `${p.reportTitle || "Report"}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      finishReport();
      toast("Report downloaded");
    } catch {
      setWorking(null);
      toast("Could not generate the PDF. Try again.", "error");
    }
  }

  async function handlePrint() {
    if (busy || saving) return;
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      toast("Allow pop-ups to open the report for printing.", "error");
      return;
    }
    setWorking("print");
    try {
      const blob = await renderReportBlob();
      const url = URL.createObjectURL(blob);
      tab.location.href = url;
      try {
        tab.opener = null;
      } catch {
        // The PDF tab can detach as soon as it navigates to the blob.
      }
      finishReport();
      toast("Report opened for printing");
    } catch {
      tab.close();
      setWorking(null);
      toast("Could not generate the PDF. Try again.", "error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {isControlled ? null : (
        <DialogTrigger asChild>
          <Button variant="outline" className="h-9">Download PDF</Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] min-h-0 w-[min(96vw,56rem)] flex-col overflow-hidden"
        hideClose={busy}
        aria-busy={busy}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        {busy ? (
          <div className="absolute inset-0 z-60 flex flex-col items-center justify-center gap-2 rounded-xl bg-popover/85">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="text-sm">Generating PDF…</p>
          </div>
        ) : null}
        <DialogHeader className="shrink-0">
          <DialogTitle>Print report</DialogTitle>
          {snapshot ? (
            <p className="text-sm text-muted-foreground">
              {snapshot.label?.trim() ? `${snapshot.label.trim()} · ` : ""}
              {snapshot.presetName} · {new Date(snapshot.savedAt).toLocaleString()}
            </p>
          ) : null}
        </DialogHeader>
        <div
          className={cn(
            "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(12rem,0.9fr)] gap-4 overflow-hidden md:grid-cols-2 md:grid-rows-1",
            busy && "pointer-events-none",
          )}
        >
          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-1">
            <div>
              <Label>Report title</Label>
              <Input
                maxLength={30}
                value={p.reportTitle}
                disabled={busy}
                onChange={(e) => setPrint({ ...p, reportTitle: e.target.value.slice(0, 30) })}
              />
            </div>
            <div>
              <Label>Paper</Label>
              <Select
                value={p.paperSize}
                disabled={busy}
                onValueChange={(value) =>
                  setPrint({ ...p, paperSize: value as "Letter" | "A4" })
                }
              >
                <SelectTrigger className="mt-1 h-9 w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-100">
                  <SelectItem value="Letter">Letter</SelectItem>
                  <SelectItem value="A4">A4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Units</Label>
              <Input
                maxLength={15}
                value={p.units}
                disabled={busy}
                onChange={(e) => setPrint({ ...p, units: e.target.value.slice(0, 15) })}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use ^ for a superscript, e.g. x10^9/L
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {toggles.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={p[key]}
                    disabled={busy}
                    onCheckedChange={(v) => setPrint({ ...p, [key]: Boolean(v) })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="space-y-2">
              {p.fields.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={f.name}
                    maxLength={30}
                    disabled={busy}
                    onChange={(e) => {
                      const fields = p.fields.map((x, idx) =>
                        idx === i ? { ...x, name: e.target.value.slice(0, 30) } : x,
                      );
                      setPrint({ ...p, fields });
                    }}
                  />
                  <Input
                    value={f.value}
                    maxLength={40}
                    placeholder="value"
                    disabled={busy}
                    onChange={(e) => {
                      const fields = p.fields.map((x, idx) =>
                        idx === i ? { ...x, value: e.target.value.slice(0, 40) } : x,
                      );
                      setPrint({ ...p, fields });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      setPrint({ ...p, fields: p.fields.filter((_, idx) => idx !== i) })
                    }
                  >
                    ×
                  </Button>
                </div>
              ))}
              {p.fields.length < 12 ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    setPrint({
                      ...p,
                      fields: [...p.fields, { name: `Field ${p.fields.length + 1}`, value: "" }],
                    })
                  }
                >
                  Add field
                </Button>
              ) : null}
            </div>
          </div>
            <div className="flex shrink-0 flex-wrap gap-2 border-t border-border p-1 pt-3">
              <Button
                variant="outline"
                disabled={saving || busy}
                onClick={() => {
                  void handleSave();
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  "Save settings"
                )}
              </Button>
              <Button
                variant="outline"
                disabled={busy || saving}
                onClick={() => {
                  void handlePrint();
                }}
              >
                <Printer aria-hidden="true" />
                Print
              </Button>
              <Button
                disabled={busy || saving}
                onClick={() => {
                  void handleDownload();
                }}
              >
                <Download aria-hidden="true" />
                Download
              </Button>
            </div>
          </div>
          <div className="relative min-h-0 min-w-0">
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative h-full max-h-full w-auto max-w-full overflow-hidden rounded-md border border-border bg-card"
                style={{ aspectRatio: p.paperSize === "A4" ? "210 / 297" : "8.5 / 11" }}
              >
                {previewUrl && !previewError ? (
                  <iframe
                    title="Report preview"
                    src={`${previewUrl}#toolbar=0&navpanes=0`}
                    className="h-full w-full border-0 bg-white"
                  />
                ) : previewError ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    Preview could not be generated.
                  </p>
                ) : null}
                {previewLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/80">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Updating preview</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
