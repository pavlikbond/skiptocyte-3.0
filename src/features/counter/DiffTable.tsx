import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useCounter } from "@/features/counter/CounterProvider";
import { looksLikeNrbc } from "@/lib/counting";
import type { Lineage } from "@/lib/types";
import { CELL_NAME_MAX } from "@/lib/types";
import { cn } from "@/lib/utils";

function SortableRow({
  id,
  flashing,
  flashTick,
  children,
}: {
  id: string;
  flashing: boolean;
  flashTick: number;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b border-border/70",
        flashing && (flashTick % 2 === 0 ? "flash-row-a" : "flash-row-b"),
      )}
    >
      <td className="w-8 text-center">
        <button
          type="button"
          className="cursor-grab p-1 text-muted-foreground"
          aria-label="Reorder row"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      {children}
    </tr>
  );
}

export function DiffTable() {
  const ctx = useCounter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
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
  }, [ctx.preset.rows]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ctx.preset.rows.findIndex((r) => r.id === active.id);
    const to = ctx.preset.rows.findIndex((r) => r.id === over.id);
    if (from >= 0 && to >= 0) ctx.reorderRows(from, to);
  };

  const addCell = () => {
    pendingFocusId.current = ctx.addRow();
  };

  return (
    <div className="overflow-x-auto">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="p-1" />
              <th className="p-1 text-center">Ignore</th>
              <th className="p-1 text-center">Key</th>
              <th className="p-1 text-center">Cell</th>
              <th className="p-1 text-center">Count</th>
              <th className="p-1 text-center">Relative</th>
              <th className="p-1 text-center">Absolute</th>
              <th className="p-1" />
            </tr>
          </thead>
          <SortableContext items={ctx.preset.rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {ctx.preset.rows.map((row) => {
                const stats = ctx.stats.get(row.id);
                return (
                  <SortableRow
                    key={row.id}
                    id={row.id}
                    flashing={ctx.flashRowId === row.id}
                    flashTick={ctx.flashTick}
                  >
                    <td className="p-1 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          className="h-5 w-5 cursor-pointer"
                          checked={row.ignore}
                          onCheckedChange={(v) => ctx.updateRow(row.id, { ignore: Boolean(v) })}
                          aria-label={`Ignore ${row.cell || "cell"}`}
                        />
                      </div>
                    </td>
                    <td className="p-1 text-center">
                      <Input
                        value={row.key}
                        className={cn(
                          "mx-auto h-8 w-16 text-center",
                          ctx.keyErrorId === row.id && "border-destructive ring-2 ring-destructive",
                        )}
                        onKeyDown={(e) => {
                          if (e.key === "Tab" || e.key === "Backspace") return;
                          e.preventDefault();
                          ctx.bindRowKey(row.id, e.key);
                        }}
                        onChange={() => undefined}
                        aria-label={`Key for ${row.cell || "cell"}`}
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        ref={(node) => {
                          if (node) nameRefs.current.set(row.id, node);
                          else nameRefs.current.delete(row.id);
                        }}
                        value={row.cell}
                        maxLength={CELL_NAME_MAX}
                        className="h-8 min-w-32 text-center"
                        onChange={(e) => {
                          const cell = e.target.value.slice(0, CELL_NAME_MAX);
                          const named = looksLikeNrbc(cell);
                          ctx.updateRow(row.id, {
                            cell,
                            nrbc: named ? true : row.nrbc && looksLikeNrbc(row.cell) ? false : row.nrbc,
                            ignore: named ? true : row.ignore,
                          });
                        }}
                        aria-label={`Name for ${row.cell || "new cell"}`}
                      />
                    </td>
                    <td className="p-1 text-center font-semibold tabular-nums">{row.count}</td>
                    <td className="p-1 text-center tabular-nums">
                      {row.ignore ? "" : `${stats?.relative ?? 0}%`}
                    </td>
                    <td className="p-1 text-center tabular-nums">
                      {row.ignore ? "" : (stats?.absolute ?? 0).toLocaleString("en-US")}
                    </td>
                    <td className="p-1 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="cursor-pointer rounded p-1 hover:bg-accent" aria-label="Row menu">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {looksLikeNrbc(row.cell) ? (
                            <DropdownMenuItem disabled>nRBC (from cell name)</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                ctx.updateRow(row.id, {
                                  nrbc: !row.nrbc,
                                  ignore: !row.nrbc ? true : row.ignore,
                                })
                              }
                            >
                              {row.nrbc ? "Unmark nRBC" : "Treat as nRBC"}
                            </DropdownMenuItem>
                          )}
                          {(["none", "myeloid", "erythroid"] as Lineage[]).map((lin) => (
                            <DropdownMenuItem key={lin} onSelect={() => ctx.updateRow(row.id, { lineage: lin })}>
                              Lineage: {lin}
                              {row.lineage === lin ? " ✓" : ""}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onSelect={() => ctx.removeRow(row.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </SortableRow>
                );
              })}
              <tr>
                <td colSpan={8} className="p-0.5">
                  <button
                    type="button"
                    onClick={addCell}
                    className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Plus className="h-4 w-4" />
                    Add Cell
                  </button>
                </td>
              </tr>
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
}
