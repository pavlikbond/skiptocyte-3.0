import { useState } from "react";
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
import { estimateValues } from "@/lib/counting";
import { morphologyFindings } from "@/lib/types";
import { useCounter } from "@/features/counter/CounterProvider";

export function PrintDialog() {
  const ctx = useCounter();
  const [open, setOpen] = useState(false);
  const p = ctx.print;
  const morphLines = morphologyFindings(ctx.morphology);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) ctx.restorePrint();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9">Download PDF</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,56rem)]">
        <DialogHeader>
          <DialogTitle>Print report</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>Report title</Label>
              <Input
                maxLength={30}
                value={p.reportTitle}
                onChange={(e) => ctx.setPrint({ ...p, reportTitle: e.target.value.slice(0, 30) })}
              />
            </div>
            <div>
              <Label>Paper</Label>
              <Select
                value={p.paperSize}
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
                onChange={(e) => ctx.setPrint({ ...p, units: e.target.value.slice(0, 15) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  ["showCell", "Cell"],
                  ["showCount", "Count"],
                  ["showRelative", "Relative"],
                  ["showAbsolute", "Absolute"],
                  ["showUnits", "Units"],
                  ["showIgnored", "Ignored rows"],
                  ["showWBC", "WBC"],
                  ["showMorphology", "Morphology"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={p[key]}
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  ctx.persistPrint();
                }}
              >
                Save settings
              </Button>
              <Button
                onClick={() => {
                  void (async () => {
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
                    setOpen(false);
                  })();
                }}
              >
                Download {p.reportTitle}.pdf
              </Button>
            </div>
          </div>
          <div className="aspect-[8.5/11] overflow-auto rounded-md border border-border bg-card p-4 text-xs text-card-foreground">
            <h3 className="mb-2 text-lg font-bold">{p.reportTitle}</h3>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {p.fields.map((f) => (
                <div key={f.name + f.value}>
                  <div className="text-[10px] text-muted-foreground">{f.name}</div>
                  <div className="min-h-4 border-b border-border">{f.value}</div>
                </div>
              ))}
            </div>
            {ctx.view === "estimate" ? (
              <>
                <p>
                  Fields {ctx.estimate.fieldCount}/{ctx.estimate.fieldCountMax}
                </p>
                <table className="mt-2 w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-1">Name</th>
                      <th className="py-1">Count</th>
                      <th className="py-1">Avg</th>
                      <th className="py-1">Estimate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctx.estimate.cells.map((c) => {
                      const v = estimateValues(
                        c,
                        ctx.estimate.fieldCount,
                        ctx.estimate.fieldCountMax,
                      );
                      return (
                        <tr key={c.id} className="border-b border-border/70">
                          <td className="py-1">{c.name}</td>
                          <td className="py-1">{c.count}</td>
                          <td className="py-1">{v.average.toFixed(2)}</td>
                          <td className="py-1">{v.estimate.toLocaleString("en-US")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                {p.showWBC ? (
                  <p>
                    WBC {ctx.wbcCount} {p.showUnits ? p.units : ""}
                    {ctx.corrected != null ? ` · Corrected ${ctx.corrected}` : ""}
                  </p>
                ) : null}
                <p>
                  {ctx.ancValue != null ? `ANC ${ctx.ancValue} ` : ""}
                  {ctx.alcValue != null ? `ALC ${ctx.alcValue} ` : ""}
                  {ctx.me ? `M:E ${ctx.me}` : ""}
                </p>
                <table className="mt-2 w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {p.showCell ? <th className="py-1">Cell</th> : null}
                      {p.showCount ? <th className="py-1">Count</th> : null}
                      {p.showRelative ? <th className="py-1">Relative</th> : null}
                      {p.showAbsolute ? <th className="py-1">Absolute</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {ctx.preset.rows
                      .filter((r) => p.showIgnored || !r.ignore)
                      .map((r) => {
                        const s = ctx.stats.get(r.id);
                        return (
                          <tr key={r.id} className="border-b border-border/70">
                            {p.showCell ? <td className="py-1">{r.cell}</td> : null}
                            {p.showCount ? <td className="py-1">{r.count}</td> : null}
                            {p.showRelative ? (
                              <td className="py-1">{r.ignore ? "" : `${s?.relative ?? 0}%`}</td>
                            ) : null}
                            {p.showAbsolute ? (
                              <td className="py-1">{r.ignore ? "" : s?.absolute ?? ""}</td>
                            ) : null}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {p.showMorphology ? (
                  <div className="mt-3">
                    <h4 className="mb-1 font-semibold">Morphology</h4>
                    {morphLines.length > 0 ? (
                      morphLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))
                    ) : (
                      <p className="text-muted-foreground">None recorded</p>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
