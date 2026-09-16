import { Plus, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCounter } from "@/features/counter/CounterProvider";
import { estimateValues } from "@/lib/counting";
import { cn, formatMaybeDecimal } from "@/lib/utils";

export function EstimateTable() {
  const ctx = useCounter();
  const { estimate } = ctx;
  const nameRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocusId = useRef<string | null>(null);

  useLayoutEffect(() => {
    const id = pendingFocusId.current;
    if (!id) return;
    const el = nameRefs.current.get(id);
    if (!el) return;
    pendingFocusId.current = null;
    el.focus();
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [estimate.cells]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimate-field-count-max">Field count limit</Label>
          <Input
            id="estimate-field-count-max"
            className="w-24"
            value={estimate.fieldCountMax}
            onChange={(e) =>
              ctx.setEstimateMeta({
                fieldCountMax: Math.max(1, parseInt(e.target.value.replace(/\D/g, ""), 10) || 1),
              })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimate-field-key">Field key</Label>
          <Input
            id="estimate-field-key"
            className={cn("w-20", ctx.keyErrorId === "field" && "border-destructive")}
            value={estimate.fieldCountKey}
            onKeyDown={(e) => {
              if (e.key === "Tab" || e.key === "Backspace") return;
              e.preventDefault();
              ctx.bindEstimateKey("field", e.key);
            }}
            onChange={() => undefined}
          />
        </div>
      </div>
      <Accordion type="single" collapsible>
        <AccordionItem value="how">
          <AccordionTrigger>How to use estimate mode</AccordionTrigger>
          <AccordionContent>
            Bind a field-count key, add cells with a key, name, and factor (default 15000). Count
            cells, then advance fields. Estimate = (cells / fields) × factor.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="p-1 text-center">Key</th>
              <th className="p-1 text-center">Name</th>
              <th className="p-1 text-center">Factor</th>
              <th className="p-1 text-center">Count</th>
              <th className="p-1 text-center">Average</th>
              <th className="p-1 text-center">Estimate</th>
              <th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {estimate.cells.map((cell) => {
              const v = estimateValues(cell, estimate.fieldCount, estimate.fieldCountMax);
              return (
                <tr key={cell.id} className="border-b border-border/70">
                  <td className="p-1 text-center">
                    <Input
                      className={cn(
                        "mx-auto h-8 w-16 text-center",
                        ctx.keyErrorId === cell.id && "border-destructive",
                      )}
                      value={cell.key}
                      onKeyDown={(e) => {
                        if (e.key === "Tab" || e.key === "Backspace") return;
                        e.preventDefault();
                        ctx.bindEstimateKey(cell.id, e.key);
                      }}
                      onChange={() => undefined}
                      aria-label={`Key for ${cell.name || "cell"}`}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      ref={(node) => {
                        if (node) nameRefs.current.set(cell.id, node);
                        else nameRefs.current.delete(cell.id);
                      }}
                      className="h-8 min-w-32 text-center"
                      value={cell.name}
                      onChange={(e) => ctx.updateEstimateCell(cell.id, { name: e.target.value })}
                      aria-label={`Name for ${cell.name || "new cell"}`}
                    />
                  </td>
                  <td className="p-1 text-center">
                    <Input
                      className="mx-auto h-8 w-24 text-center"
                      value={cell.factor ?? ""}
                      onChange={(e) => {
                        const n = e.target.value === "" ? null : Number(e.target.value);
                        ctx.updateEstimateCell(cell.id, {
                          factor: n == null || Number.isNaN(n) ? null : n,
                        });
                      }}
                      aria-label={`Factor for ${cell.name || "cell"}`}
                    />
                  </td>
                  <td
                    className={cn(
                      "p-1 text-center font-semibold tabular-nums",
                      ctx.flashRowId === cell.id &&
                        (ctx.flashTick % 2 === 0 ? "flash-row-a" : "flash-row-b"),
                    )}
                  >
                    {cell.count}
                  </td>
                  <td className="p-1 text-center tabular-nums">{formatMaybeDecimal(v.average, 2)}</td>
                  <td className="p-1 text-center tabular-nums">{formatMaybeDecimal(v.estimate, 2)}</td>
                  <td className="p-1 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mx-auto"
                      onClick={() => ctx.removeEstimateCell(cell.id)}
                      aria-label={`Remove ${cell.name || "cell"}`}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={7} className="p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    pendingFocusId.current = ctx.addEstimateCell();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Plus className="h-4 w-4" />
                  Add Cell
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
