import { ChevronRight, ClipboardList, Download, History, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCounter } from "@/features/counter/CounterProvider";
import { PrintDialog } from "@/features/pdf/PrintDialog";
import type { HistoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HistorySidebar() {
  const { user, loading: authLoading } = useAuth();
  const ctx = useCounter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [pendingLoad, setPendingLoad] = useState<HistoryEntry | null>(null);
  const [printEntry, setPrintEntry] = useState<HistoryEntry | null>(null);

  const loadEntry = (entry: HistoryEntry) => {
    if (!ctx.loadHistoryEntry(entry.id)) setPendingLoad(entry);
  };

  return (
    <>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="relative border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Save count"
              className="h-9 justify-center bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground active:bg-sidebar-primary/90 active:text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8!"
              disabled={!ctx.ready}
              onClick={ctx.saveCountToHistory}
            >
              <Plus />
              <span className="group-data-[collapsible=icon]:hidden">Save count</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="pointer-events-none group-data-[collapsible=icon]:justify-center"
                tooltip="History"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                  <History className="size-4" />
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">History</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    {authLoading
                      ? "Loading…"
                      : user
                        ? "This device · your account"
                        : "This device · guest"}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="hidden shrink-0 md:flex group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Saved counts</SidebarGroupLabel>
          <SidebarGroupContent>
            {!ctx.ready ? (
              <p className="px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                Loading saved counts…
              </p>
            ) : ctx.history.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                No saved counts yet. Snapshots stay on this device and do not
                include patient identifiers.
              </p>
            ) : (
              <SidebarMenu className="gap-2.5 group-data-[collapsible=icon]:gap-1">
                {ctx.history.map((entry) => (
                  <HistoryEntryItem
                    key={entry.id}
                    entry={entry}
                    onLoad={() => loadEntry(entry)}
                    onDownload={() => {
                      if (isMobile) setOpenMobile(false);
                      setPrintEntry(entry);
                    }}
                    onDelete={() => ctx.deleteHistoryEntry(entry.id)}
                  />
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Clear all"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={!ctx.ready}
              onClick={ctx.clearHistory}
            >
              <Trash2 />
              <span>Clear all</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      </Sidebar>

      <AlertDialog
        open={pendingLoad != null}
        onOpenChange={(open) => {
          if (!open) setPendingLoad(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load this saved count?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the active count with the {pendingLoad?.presetName} snapshot.
              The snapshot loads as a temporary setup, not a preset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingLoad) ctx.loadHistoryEntry(pendingLoad.id, true);
                setPendingLoad(null);
              }}
            >
              Load count
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrintDialog
        snapshot={printEntry}
        open={printEntry != null}
        onOpenChange={(open) => {
          if (!open) setPrintEntry(null);
        }}
      />
    </>
  );
}

function HistoryEntryItem({
  entry,
  onLoad,
  onDownload,
  onDelete,
}: {
  entry: HistoryEntry;
  onLoad: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const tallyLabel = `${entry.tally}/${entry.maxWBC}`;
  const ancLabel = entry.anc != null ? ` · ANC ${entry.anc}` : "";

  return (
    <SidebarMenuItem
      className={cn(
        "rounded-lg border border-sidebar-border bg-card text-card-foreground",
        "shadow-[0_1px_2px_oklch(0.32_0.04_250/0.06)]",
        "transition-[border-color,box-shadow] duration-200 ease-out",
        "hover:border-sidebar-ring/50",
        "hover:shadow-[0_1px_2px_oklch(0.32_0.04_250/0.08),0_8px_24px_oklch(0.32_0.04_250/0.06)]",
        "group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:hover:shadow-none",
      )}
    >
      <SidebarMenuButton
        className={cn(
          "h-auto cursor-pointer items-start py-2 pr-12 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:pr-2",
          "hover:bg-transparent hover:text-card-foreground",
          "active:bg-transparent active:text-card-foreground",
          "focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50",
          "group-data-[collapsible=icon]:hover:bg-sidebar-accent group-data-[collapsible=icon]:hover:text-sidebar-accent-foreground",
          "group-data-[collapsible=icon]:active:bg-sidebar-accent group-data-[collapsible=icon]:active:text-sidebar-accent-foreground",
        )}
        tooltip={`Load ${entry.presetName} · ${tallyLabel}`}
        onClick={onLoad}
      >
        <ClipboardList />
        <div className="grid min-w-0 flex-1 text-left leading-tight">
          <span className="truncate font-medium">{entry.presetName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {new Date(entry.savedAt).toLocaleString()}
          </span>
          <span className="truncate text-xs font-medium tabular-nums lining-nums">
            {tallyLabel}
            {ancLabel}
          </span>
        </div>
      </SidebarMenuButton>
      <SidebarMenuAction
        aria-label={`Download PDF of ${entry.presetName} count`}
        className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={onDownload}
      >
        <Download />
      </SidebarMenuAction>
      <SidebarMenuAction
        showOnHover
        aria-label={`Delete ${entry.presetName} count`}
        className="right-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive peer-hover/menu-button:text-muted-foreground"
        onClick={onDelete}
      >
        <Trash2 />
      </SidebarMenuAction>
      <details className="group/details mb-2 ml-8 mr-2 group-data-[collapsible=icon]:hidden open:border-t open:border-sidebar-border open:pt-1.5">
        <summary className="flex cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground hover:text-card-foreground focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-3 shrink-0 transition-transform duration-200 group-open/details:rotate-90" />
          Details
        </summary>
        <ul className="mt-1 space-y-0.5 text-xs tabular-nums lining-nums text-card-foreground/80">
          {entry.rows.map((r) => (
            <li key={r.cell}>
              {r.cell}: {r.count}
              {r.ignore ? " (ignore)" : ` · ${r.relative}%`}
            </li>
          ))}
        </ul>
      </details>
    </SidebarMenuItem>
  );
}
