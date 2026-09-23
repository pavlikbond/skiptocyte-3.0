import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiffTable } from "@/features/counter/DiffTable";
import { KeyboardLayoutToggle, Keypad } from "@/features/counter/Keypad";
import { MorphologyPanel } from "@/features/counter/MorphologyPanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCounter } from "@/features/counter/CounterProvider";
import { EstimateTable } from "@/features/estimate/EstimateTable";
import { PrintDialog } from "@/features/pdf/PrintDialog";
import { ImportExport } from "@/features/presets/ImportExport";
import { SoundDialog } from "@/features/sounds/SoundDialog";
import { cn } from "@/lib/utils";

type PendingApply = { id: string; name: string } | null;

export function CounterPage() {
  const { user } = useAuth();
  return <CounterScreen key={user?.uid ?? "guest"} />;
}

function CounterScreen() {
  const ctx = useCounter();
  const [clearOpen, setClearOpen] = useState(false);
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [presetStep, setPresetStep] = useState<"list" | "delete" | "export" | "import">("list");
  const [switchOpen, setSwitchOpen] = useState(false);
  const [saveName, setSaveName] = useState("My preset");
  const [renameName, setRenameName] = useState("");
  const [actionPresetId, setActionPresetId] = useState<string>("");
  const [pendingApply, setPendingApply] = useState<PendingApply>(null);
  const [historyPrompt, setHistoryPrompt] = useState(false);
  const [wbcText, setWbcText] = useState("");
  const holdRef = useRef<number | null>(null);
  const prompted = useRef(false);

  const sourceLabel = useMemo(() => {
    if (ctx.setupSource.kind === "custom") return "Unsaved setup";
    return ctx.setupSource.name;
  }, [ctx.setupSource]);

  const sourceDescription =
    ctx.setupSource.kind === "saved"
      ? "Selected preset"
      : ctx.setupSource.kind === "history"
        ? "Loaded from history · not a preset"
      : ctx.setupSource.kind === "builtin"
        ? "Starter preset"
        : "Not saved as a preset";

  const actionPreset = ctx.presets.find((p) => p.id === actionPresetId) ?? null;
  const countActionClass = cn(
    "min-w-0 flex-1",
    ctx.isHandset ? "h-11 min-h-11" : "h-9 px-2",
  );

  useEffect(() => {
    setWbcText(ctx.wbcCount > 0 ? String(ctx.wbcCount) : "");
  }, [ctx.wbcCount]);

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

  const requestApply = (choice: Exclude<PendingApply, null>) => {
    setPresetManagerOpen(false);
    const applied = ctx.applySavedPreset(choice.id);
    if (applied) return;
    setPendingApply(choice);
    setSwitchOpen(true);
  };

  const confirmApply = () => {
    if (!pendingApply) return;
    ctx.applySavedPreset(pendingApply.id, true);
    setSwitchOpen(false);
    setPendingApply(null);
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
      <div className="flex min-w-0 flex-wrap justify-center gap-4">
        <div className="min-w-[min(100%,36rem)] flex-2 space-y-3">
          <Card className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              value={ctx.view}
              onValueChange={(v) => ctx.setView(v as "standard" | "estimate")}
            >
              <TabsList className="h-9">
                <TabsTrigger className="h-7" value="standard">Diff</TabsTrigger>
                <TabsTrigger className="h-7" value="estimate">Estimate</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap items-center gap-2">
              <PrintDialog />
              <SoundDialog />
            </div>
          </Card>

          <Card>
            {ctx.view === "standard" ? (
              <>
                <div className="-mx-3 -mt-3 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-3 sm:-mx-4 sm:-mt-4 sm:px-4">
                  <Button
                    className="h-9 min-w-44 justify-between"
                    variant="outline"
                    aria-label={`Choose setup. Current setup: ${sourceLabel}`}
                    onClick={() => setPresetManagerOpen(true)}
                  >
                    <span className="truncate">{sourceLabel}</span>
                    <ChevronDown aria-hidden="true" />
                  </Button>
                  <div className="ml-auto flex items-end gap-2.5">
                    <Label htmlFor="absolute-count">Absolute count</Label>
                    <Input
                      id="absolute-count"
                      value={wbcText}
                      placeholder="WBC"
                      inputMode="decimal"
                      className="h-auto w-28 rounded-none border-0 border-b-2 border-border bg-transparent px-0.5 py-0 pb-0.5 text-center text-sm leading-none tabular-nums shadow-none focus-visible:border-ring focus-visible:ring-0"
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
        </div>
        <Card
          className={cn(
            "max-w-full self-start",
            ctx.isHandset
              ? "w-full"
              : ctx.keyboardType === "keyboard"
                ? "w-full min-w-[min(100%,36rem)] max-w-184 flex-1"
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
            <div className="mb-3">
              <Label htmlFor="count-limit">Count limit</Label>
              <Input
                id="count-limit"
                value={ctx.preset.maxWBC}
                onChange={(e) =>
                  ctx.setMaxWBC(parseInt(e.target.value.replace(/\D/g, ""), 10) || 1)
                }
              />
            </div>
          ) : null}
          <div className={cn(!ctx.isHandset && ctx.keyboardType === "numpad" && "counter-pad")}>
            <div className="mb-3 flex items-center gap-2">
              <Button
                variant={ctx.increase ? "default" : "outline"}
                className={countActionClass}
                onClick={() => ctx.setIncrease(true)}
              >
                +
              </Button>
              <Button
                variant={!ctx.increase ? "default" : "outline"}
                className={countActionClass}
                onClick={() => ctx.setIncrease(false)}
              >
                -
              </Button>
              <Button variant="outline" className={countActionClass} onClick={ctx.undo}>
                Undo
              </Button>
              {!ctx.isHandset ? <KeyboardLayoutToggle /> : null}
            </div>
            <Keypad />
          </div>
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

      <Dialog
        open={presetManagerOpen}
        onOpenChange={(open) => {
          setPresetManagerOpen(open);
          if (!open) setPresetStep("list");
        }}
      >
        <DialogContent className="w-[min(96vw,38rem)]">
          {presetStep === "delete" ? (
            <>
              <DialogHeader>
                <DialogTitle>Delete {actionPreset?.name ?? "preset"}?</DialogTitle>
                <p className="text-sm text-muted-foreground">This cannot be undone.</p>
              </DialogHeader>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPresetStep("list")}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (actionPreset) void ctx.deleteSavedPreset(actionPreset.id);
                    setPresetStep("list");
                  }}
                >
                  Delete
                </Button>
              </div>
            </>
          ) : (
            <ImportExport
              step={presetStep === "export" || presetStep === "import" ? presetStep : "list"}
              onStepChange={setPresetStep}
            >
              <DialogHeader>
                <DialogTitle>Presets</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Select a preset or manage the layouts you have saved.
                </p>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{sourceLabel}</p>
                    <p className="text-xs text-muted-foreground">{sourceDescription}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPresetManagerOpen(false);
                      setSaveOpen(true);
                    }}
                    disabled={ctx.saving}
                  >
                    {ctx.setupSource.kind === "saved" ? "Save as new preset" : "Save as preset"}
                  </Button>
                </div>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Presets</h3>

                  {ctx.presets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-5">
                      <p className="text-sm font-medium">No presets yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your current setup still works normally. Save it when you want to reuse it.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {ctx.presets.map((preset) => {
                        const selected =
                          ctx.setupSource.kind === "saved" && ctx.setupSource.id === preset.id;
                        return (
                          <div
                            key={preset.id}
                            className={cn(
                              "flex items-center justify-between gap-3 p-3",
                              selected && "bg-accent/50",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{preset.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {preset.rows.length === 1
                                  ? "1 cell"
                                  : `${preset.rows.length} cells`}{" "}
                                · limit {preset.maxWBC}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Button
                                size="sm"
                                variant={selected ? "outline" : "default"}
                                disabled={selected}
                                onClick={() => requestApply({ id: preset.id, name: preset.name })}
                              >
                                {selected ? "Selected" : "Select"}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={`Manage ${preset.name}`}
                                  >
                                    <MoreHorizontal aria-hidden="true" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setActionPresetId(preset.id);
                                      setPresetManagerOpen(false);
                                      setUpdateOpen(true);
                                    }}
                                  >
                                    Update with current setup
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setActionPresetId(preset.id);
                                      setRenameName(preset.name);
                                      setPresetManagerOpen(false);
                                      setRenameOpen(true);
                                    }}
                                  >
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    onSelect={() => {
                                      setActionPresetId(preset.id);
                                      window.setTimeout(() => setPresetStep("delete"), 0);
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </ImportExport>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={saveOpen} onOpenChange={setSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save current setup</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="save-preset-name">Name</Label>
            <Input
              id="save-preset-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void ctx.saveCurrentAsPreset(saveName);
                setSaveOpen(false);
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update {actionPreset?.name ?? "preset"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Replace its cells, key bindings, and count limit with the current setup.
              Counts are never saved to presets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!actionPreset) return;
                void ctx.updateSavedPreset(actionPreset.id);
                setUpdateOpen(false);
              }}
            >
              Update preset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename preset</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-preset-name">Name</Label>
            <Input
              id="rename-preset-name"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!actionPreset) return;
                void ctx.renameSavedPreset(actionPreset.id, renameName);
                setRenameOpen(false);
              }}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new count with {pendingApply?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the active Diff count and load the selected setup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApply}>Load setup</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={historyPrompt} onOpenChange={setHistoryPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save this count to history?</AlertDialogTitle>
            <AlertDialogDescription>
              Anonymous snapshot of cell counts only - no patient fields.
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
