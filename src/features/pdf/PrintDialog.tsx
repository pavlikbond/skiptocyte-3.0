import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { useCounter } from "@/features/counter/CounterProvider";
import { cn } from "@/lib/utils";

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

export function PrintDialog() {
  const ctx = useCounter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const skipRestore = useRef(false);
  const p = ctx.print;
  const busy = downloading;
  const toggles = ctx.view === "estimate" ? ESTIMATE_TOGGLES : DIFF_TOGGLES;

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
            ctx.view === "estimate"
              ? await renderEstimateBlob({
                  print: p,
                  fieldCount: ctx.estimate.fieldCount,
                  fieldCountMax: ctx.estimate.fieldCountMax,
                  cells: ctx.estimate.cells,
                })
              : await renderDiffBlob({
                  print: p,
                  rows: ctx.preset.rows,
                  stats: ctx.stats,
                  wbcCount: ctx.wbcCount,
                  corrected: ctx.corrected,
                  ancValue: ctx.ancValue,
                  alcValue: ctx.alcValue,
                  me: ctx.me,
                  morphology: ctx.morphology,
                });
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
    ctx.view,
    p,
    ctx.preset.rows,
    ctx.stats,
    ctx.wbcCount,
    ctx.corrected,
    ctx.ancValue,
    ctx.alcValue,
    ctx.me,
    ctx.morphology,
    ctx.estimate.fieldCount,
    ctx.estimate.fieldCountMax,
    ctx.estimate.cells,
  ]);

  function handleOpenChange(next: boolean) {
    if (busy && !next) return;
    if (!next && !skipRestore.current) ctx.restorePrint();
    skipRestore.current = false;
    setOpen(next);
  }

  async function handleSave() {
    if (saving || busy) return;
    setSaving(true);
    ctx.persistPrint();
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setSaving(false);
    toast("Settings saved");
  }

  async function handleDownload() {
    if (busy || saving) return;
    setDownloading(true);
    try {
      const { downloadDiffPdf, downloadEstimatePdf } = await import(
        "@/features/pdf/reports"
      );
      if (ctx.view === "estimate") {
        await downloadEstimatePdf({
          print: p,
          fieldCount: ctx.estimate.fieldCount,
          fieldCountMax: ctx.estimate.fieldCountMax,
          cells: ctx.estimate.cells,
        });
      } else {
        await downloadDiffPdf({
          print: p,
          rows: ctx.preset.rows,
          stats: ctx.stats,
          wbcCount: ctx.wbcCount,
          corrected: ctx.corrected,
          ancValue: ctx.ancValue,
          alcValue: ctx.alcValue,
          me: ctx.me,
          morphology: ctx.morphology,
        });
      }
      ctx.persistPrint();
      skipRestore.current = true;
      setDownloading(false);
      setOpen(false);
      toast("Report downloaded");
    } catch {
      setDownloading(false);
      toast("Could not generate the PDF. Try again.", "error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9">Download PDF</Button>
      </DialogTrigger>
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
                onChange={(e) => ctx.setPrint({ ...p, reportTitle: e.target.value.slice(0, 30) })}
              />
            </div>
            <div>
              <Label>Paper</Label>
              <Select
                value={p.paperSize}
                disabled={busy}
                onValueChange={(value) =>
                  ctx.setPrint({ ...p, paperSize: value as "Letter" | "A4" })
                }
              >
                <SelectTrigger className="mt-1 h-9 w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
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
                onChange={(e) => ctx.setPrint({ ...p, units: e.target.value.slice(0, 15) })}
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
                    onCheckedChange={(v) => ctx.setPrint({ ...p, [key]: Boolean(v) })}
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
                      ctx.setPrint({ ...p, fields });
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
                      ctx.setPrint({ ...p, fields });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      ctx.setPrint({ ...p, fields: p.fields.filter((_, idx) => idx !== i) })
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
                    ctx.setPrint({
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
                disabled={busy || saving}
                onClick={() => {
                  void handleDownload();
                }}
              >
                Download {p.reportTitle}.pdf
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
