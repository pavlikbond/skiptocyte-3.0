import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DiffTable } from "@/features/counter/DiffTable";
import { Keypad } from "@/features/counter/Keypad";
import { MorphologyPanel } from "@/features/counter/MorphologyPanel";
import { useCounter } from "@/features/counter/CounterProvider";
import { EstimateTable } from "@/features/estimate/EstimateTable";
import { PrintDialog } from "@/features/pdf/PrintDialog";
import { ImportExport } from "@/features/presets/ImportExport";
import { SoundDialog } from "@/features/sounds/SoundDialog";
import { cn } from "@/lib/utils";

export function CounterPage() {
  const ctx = useCounter();
  const [clearOpen, setClearOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState("New Preset");
  const [newMax, setNewMax] = useState("100");
  const [historyPrompt, setHistoryPrompt] = useState(false);
  const [wbcText, setWbcText] = useState("");
  const holdRef = useRef<number | null>(null);
  const prompted = useRef(false);

  useEffect(() => {
    if (
      ctx.view === "standard" &&
      ctx.tallyValue >= ctx.preset.maxWBC &&
      ctx.tallyValue > 0 &&
      !prompted.current
    ) {
      prompted.current = true;
      setHistoryPrompt(true);
    }
    if (ctx.tallyValue === 0) prompted.current = false;
  }, [ctx.tallyValue, ctx.preset.maxWBC, ctx.view]);

  const startHold = () => {
    holdRef.current = window.setTimeout(() => {
      ctx.clearSession();
      holdRef.current = null;
    }, 600);
  };
  const endHold = () => {
    if (holdRef.current) {
      window.clearTimeout(holdRef.current);
      holdRef.current = null;
      setClearOpen(true);
    }
  };

  if (!ctx.ready) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-2">
        <Tabs
          value={ctx.view}
          onValueChange={(v) => ctx.setView(v as "standard" | "estimate")}
        >
          <TabsList className="h-9">
            <TabsTrigger className="h-7" value="standard">Diff</TabsTrigger>
            <TabsTrigger className="h-7" value="estimate">Estimate</TabsTrigger>
          </TabsList>
        </Tabs>
        {ctx.view === "standard" ? (
          <>
            <Select value={ctx.selectedId} onValueChange={ctx.selectPreset}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ctx.presets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="h-9" onClick={() => void ctx.saveNow()} disabled={ctx.saving}>
              {ctx.saving ? "Saving…" : "Save"}
            </Button>
            <Button className="h-9" variant="outline" onClick={() => setNewOpen(true)}>
              New Preset
            </Button>
            <Button className="h-9" variant="outline" onClick={() => setDeleteOpen(true)}>
              Delete Preset
            </Button>
            <ImportExport />
          </>
        ) : null}
      </Card>

      <Card className="flex flex-wrap items-center gap-2">
        <PrintDialog />
        <SoundDialog />
      </Card>

      <div className="flex min-w-0 flex-wrap justify-center gap-4">
        <Card className="min-w-[min(100%,36rem)] flex-[2]">
          {ctx.view === "standard" ? (
            <>
              <DiffTable />
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {ctx.corrected != null ? <span>Corrected WBC {ctx.corrected}</span> : null}
                {ctx.ancValue != null ? <span>ANC {ctx.ancValue}</span> : null}
                {ctx.alcValue != null ? <span>ALC {ctx.alcValue}</span> : null}
                {ctx.me ? <span>M:E {ctx.me}</span> : null}
              </div>
              <MorphologyPanel />
            </>
          ) : (
            <EstimateTable />
          )}
        </Card>
        <Card
          className={cn(
            "max-w-full self-start",
            ctx.keyboardType === "keyboard" && !ctx.isHandset
              ? "w-full min-w-[min(100%,36rem)] max-w-[46rem] flex-1"
              : "w-[min(100%,21rem)] shrink-0",
          )}
        >
          <div className={cn("mb-3 text-center text-3xl font-bold tabular-nums", ctx.shake && "shake")}>
            {ctx.view === "standard"
              ? `${ctx.tallyValue} / ${ctx.preset.maxWBC}`
              : `${ctx.estimate.fieldCount} / ${ctx.estimate.fieldCountMax}`}
          </div>
          <Button
            variant="outline"
            className="mb-3 w-full"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
          >
            Clear
          </Button>
          {ctx.view === "standard" ? (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <Label>Count limit</Label>
                <Input
                  value={ctx.preset.maxWBC}
                  onChange={(e) =>
                    ctx.setMaxWBC(parseInt(e.target.value.replace(/\D/g, ""), 10) || 1)
                  }
                />
              </div>
              <div>
                <Label>Absolute count</Label>
                <Input
                  value={wbcText}
                  placeholder="WBC"
                  inputMode="decimal"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setWbcText("");
                      ctx.setWbcCount(0);
                      return;
                    }
                    if (!/^\d{0,6}(\.\d{0,3})?$/.test(v)) return;
                    setWbcText(v);
                    if (!v.endsWith(".")) ctx.setWbcCount(Number(v));
                  }}
                />
              </div>
            </div>
          ) : null}
          <div className="mb-3 flex justify-center gap-2">
            <Button
              variant={ctx.increase ? "default" : "outline"}
              onClick={() => ctx.setIncrease(true)}
            >
              +
            </Button>
            <Button
              variant={!ctx.increase ? "default" : "outline"}
              onClick={() => ctx.setIncrease(false)}
            >
              −
            </Button>
            <Button variant="outline" onClick={ctx.undo}>
              Undo
            </Button>
          </div>
          <Keypad />
        </Card>
      </div>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear counts?</AlertDialogTitle>
            <AlertDialogDescription>
              This zeros the current session. It is not saved to history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={ctx.clearSession}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={newOpen} onOpenChange={setNewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New preset</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-preset-name">Name</Label>
              <Input
                id="new-preset-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-preset-max">Count limit</Label>
              <Input
                id="new-preset-max"
                value={newMax}
                onChange={(e) => setNewMax(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                ctx.createPreset(newName || "New Preset", parseInt(newMax, 10) || 100);
                setNewOpen(false);
              }}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {ctx.preset.name}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={ctx.deletePreset}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={historyPrompt} onOpenChange={setHistoryPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this count to history?</AlertDialogTitle>
            <AlertDialogDescription>
              Anonymous snapshot of cell counts only — no patient fields.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={ctx.saveCountToHistory}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
