import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CircleHelp, MoreHorizontal } from "lucide-react";
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
import { HowToTour } from "@/features/counter/HowToTour";
import { KeyboardLayoutToggle, Keypad } from "@/features/counter/Keypad";
import { MorphologyPanel } from "@/features/counter/MorphologyPanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCounterHistory } from "@/features/counter/context/useCounterHistory";
import { useCounterPresets } from "@/features/counter/context/useCounterPresets";
import { useCounterSession } from "@/features/counter/context/useCounterSession";
import { EstimateTable } from "@/features/estimate/EstimateTable";
import { PrintDialog } from "@/features/pdf/PrintDialog";
import { ImportExport } from "@/features/presets/ImportExport";
import { SoundDialog } from "@/features/sounds/SoundDialog";

function keepPresetDialogDuringTour(event: { preventDefault: () => void }) {
  if (document.querySelector("[data-howto-card]")) event.preventDefault();
}
import { cn } from "@/lib/utils";

type PendingApply = { id: string; name: string } | null;

export function CounterPage() {
  const { user } = useAuth();
  return <CounterScreen key={user?.uid ?? "guest"} />;
}

function CounterScreen() {
  const session = useCounterSession();
  const presetLibrary = useCounterPresets();
  const history = useCounterHistory();
  const setRuntimeActive = session.setRuntimeActive;
  const [clearOpen, setClearOpen] = useState(false);
  const [presetManagerOpen, setPresetManagerOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [presetStep, setPresetStep] = useState<"list" | "save" | "delete" | "export" | "import">("list");
  const [switchOpen, setSwitchOpen] = useState(false);
  const [saveName, setSaveName] = useState("My preset");
  const [renameName, setRenameName] = useState("");
  const [actionPresetId, setActionPresetId] = useState<string>("");
  const [pendingApply, setPendingApply] = useState<PendingApply>(null);
  const [historyPrompt, setHistoryPrompt] = useState(false);
  const [tourRun, setTourRun] = useState(0);
  const [wbcText, setWbcText] = useState("");
  const holdRef = useRef<number | null>(null);
  const prompted = useRef(false);

  const sourceLabel = useMemo(() => {
    if (session.setupSource.kind === "custom") return "Unsaved setup";
    return session.setupSource.name;
  }, [session.setupSource]);

  const sourceDescription =
    session.setupSource.kind === "saved"
      ? "Selected preset"
      : session.setupSource.kind === "history"
        ? "Loaded from history · not a preset"
      : session.setupSource.kind === "builtin"
        ? "Starter preset"
        : "Not saved as a preset";

  const actionPreset = presetLibrary.presets.find((p) => p.id === actionPresetId) ?? null;
  const countActionClass = cn(
    "min-w-0 flex-1",
    session.isHandset ? "h-11 min-h-11" : "h-9 px-2",
  );

  useEffect(() => {
    setWbcText((current) => {
      // "12." is 12, but keep the trailing dot so the next digit can still be typed.
      if (current.endsWith(".") && Number(current) === session.wbcCount) return current;
      return session.wbcCount > 0 ? String(session.wbcCount) : "";
    });
  }, [session.wbcCount]);

  useEffect(() => {
    if (session.view !== "standard") setTourRun(0);
  }, [session.view]);

  useEffect(() => {
    if (
      session.view === "standard" &&
      session.tallyValue >= session.preset.maxWBC &&
      session.tallyValue > 0 &&
      !prompted.current
    ) {
      prompted.current = true;
      setHistoryPrompt(true);
    }
    if (session.tallyValue === 0) prompted.current = false;
  }, [session.tallyValue, session.preset.maxWBC, session.view]);

  useEffect(() => {
    setRuntimeActive(true);
    return () => setRuntimeActive(false);
  }, [setRuntimeActive]);

  const startHold = () => {
    holdRef.current = window.setTimeout(() => {
      session.clearSession();
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
    const applied = presetLibrary.applySavedPreset(choice.id);
    if (applied) return;
    setPendingApply(choice);
    setSwitchOpen(true);
  };

  const confirmApply = () => {
    if (!pendingApply) return;
    presetLibrary.applySavedPreset(pendingApply.id, true);
    setSwitchOpen(false);
    setPendingApply(null);
  };

  if (!session.ready) {
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
              value={session.view}
              onValueChange={(v) => session.setView(v as "standard" | "estimate")}
            >
              <TabsList className="h-9">
                <TabsTrigger className="h-7" value="standard">Diff</TabsTrigger>
                <TabsTrigger className="h-7" value="estimate">Estimate</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap items-center gap-2">
              {session.view === "standard" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 bg-(--timer-run-chip) text-(--timer-run-ink) hover:bg-(--timer-run-track) hover:text-(--timer-run-ink)"
                  onClick={() => setTourRun((run) => run + 1)}
                >
                  <CircleHelp aria-hidden="true" />
                  How to
                </Button>
              ) : null}
              <PrintDialog />
              <SoundDialog />
            </div>
          </Card>

          <Card>
            {session.view === "standard" ? (
              <>
                <div className="-mx-3 -mt-3 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-3 sm:-mx-4 sm:-mt-4 sm:px-4">
                  <Button
                    className="h-9 min-w-44 justify-between"
                    variant="outline"
                    data-howto="presets"
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
                      className="h-auto w-28 rounded-none border-0 border-b-2 border-input bg-transparent px-0.5 py-0 pb-0.5 text-center text-sm leading-none tabular-nums shadow-none focus-visible:border-ring focus-visible:ring-0 dark:bg-transparent"
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                          setWbcText("");
                          session.setWbcCount(0);
                          return;
                        }
                        if (!/^\d{0,6}(\.\d{0,3})?$/.test(v)) return;
                        setWbcText(v);
                        const n = Number(v);
                        if (Number.isFinite(n)) session.setWbcCount(n);
                      }}
                    />
                  </div>
                </div>
                <DiffTable />
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {session.corrected != null ? <span>Corrected WBC {session.corrected}</span> : null}
                  {session.ancValue != null ? <span>ANC {session.ancValue}</span> : null}
                  {session.alcValue != null ? <span>ALC {session.alcValue}</span> : null}
                  {session.me ? <span>M:E {session.me}</span> : null}
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
            session.isHandset
              ? "w-full"
              : session.keyboardType === "keyboard"
                ? "w-full min-w-[min(100%,36rem)] max-w-184 flex-1"
                : "w-[min(100%,21rem)] shrink-0",
          )}
        >
          <div className={cn("mb-3 text-center text-3xl font-bold tabular-nums", session.shake && "shake")}>
            {session.view === "standard"
              ? `${session.tallyValue} / ${session.preset.maxWBC}`
              : `${session.estimate.fieldCount} / ${session.estimate.fieldCountMax}`}
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
          {session.view === "standard" ? (
            <div className="mb-3">
              <Label htmlFor="count-limit">Count limit</Label>
              <Input
                id="count-limit"
                data-howto="count-limit"
                value={session.preset.maxWBC}
                onChange={(e) =>
                  session.setMaxWBC(parseInt(e.target.value.replace(/\D/g, ""), 10) || 1)
                }
              />
            </div>
          ) : null}
          <div className={cn(!session.isHandset && session.keyboardType === "numpad" && "counter-pad")}>
            <div className="mb-3 flex items-center gap-2">
              <Button
                variant={session.increase ? "default" : "outline"}
                className={countActionClass}
                onClick={() => session.setIncrease(true)}
              >
                +
              </Button>
              <Button
                variant={!session.increase ? "default" : "outline"}
                className={countActionClass}
                data-howto="minus"
                onClick={() => session.setIncrease(false)}
              >
                -
              </Button>
              <Button variant="outline" className={countActionClass} onClick={session.undo}>
                Undo
              </Button>
              {!session.isHandset ? <KeyboardLayoutToggle /> : null}
            </div>
            <Keypad />
          </div>
        </Card>
      </div>

      {tourRun > 0 && session.view === "standard" ? (
        <HowToTour key={tourRun} onClose={() => setTourRun(0)} />
      ) : null}

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
            <AlertDialogAction onClick={session.clearSession}>Clear</AlertDialogAction>
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
        <DialogContent
          className="w-[min(96vw,38rem)]"
          data-howto-preset=""
          onPointerDownOutside={keepPresetDialogDuringTour}
          onFocusOutside={keepPresetDialogDuringTour}
          onInteractOutside={keepPresetDialogDuringTour}
        >
          {presetStep === "save" ? (
            <div data-howto="save-dialog">
              <DialogHeader>
                <DialogTitle>Save current setup</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Counts are not stored in the preset.
                </p>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="save-preset-name">Name</Label>
                <Input
                  id="save-preset-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPresetStep("list")}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    void presetLibrary.saveCurrentAsPreset(saveName);
                    setPresetStep("list");
                  }}
                  disabled={presetLibrary.saving}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : presetStep === "delete" ? (
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
                    if (actionPreset) void presetLibrary.deleteSavedPreset(actionPreset.id);
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
                    data-howto="save-preset"
                    onClick={() => setPresetStep("save")}
                    disabled={presetLibrary.saving}
                  >
                    {session.setupSource.kind === "saved" ? "Save as new preset" : "Save as preset"}
                  </Button>
                </div>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Presets</h3>

                  {presetLibrary.presets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-5">
                      <p className="text-sm font-medium">No presets yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your current setup still works normally. Save it when you want to reuse it.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {presetLibrary.presets.map((preset) => {
                        const selected =
                          session.setupSource.kind === "saved" && session.setupSource.id === preset.id;
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
                                data-howto={selected ? undefined : "select-preset"}
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
                void presetLibrary.updateSavedPreset(actionPreset.id);
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
                void presetLibrary.renameSavedPreset(actionPreset.id, renameName);
                setRenameOpen(false);
              }}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={switchOpen} onOpenChange={setSwitchOpen}>
        <AlertDialogContent data-howto-preset="" data-howto="switch-dialog">
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
            <AlertDialogAction onClick={history.saveCountToHistory}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
