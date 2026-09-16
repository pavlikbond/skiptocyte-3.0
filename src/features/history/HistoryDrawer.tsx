import { ClipboardList, History, Plus, Trash2 } from "lucide-react";
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
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCounter } from "@/features/counter/CounterProvider";
import type { HistoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HistorySidebar() {
  const { user } = useAuth();
  const ctx = useCounter();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="relative border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Save count"
              className="h-9 justify-center bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground active:bg-sidebar-primary/90 active:text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8!"
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
                    {user ? "This device · not synced" : "This device · guest"}
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
              onClick={ctx.clearHistory}
            >
              <Trash2 />
              <span>Clear all</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function HistoryEntryItem({
  entry,
  onDelete,
}: {
  entry: HistoryEntry;
  onDelete: () => void;
}) {
  const tallyLabel = `${entry.tally}/${entry.maxWBC}`;
  const ancLabel = entry.anc != null ? ` · ANC ${entry.anc}` : "";

  return (
    <SidebarMenuItem
      className={cn(
        "rounded-lg border border-sidebar-border bg-card text-card-foreground",
        "shadow-[0_1px_2px_oklch(0.32_0.04_250/0.06)]",
        "transition-[border-color,box-shadow] hover:border-sidebar-ring/35",
        "group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none",
      )}
    >
      <SidebarMenuButton
        className="h-auto items-start py-2 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:items-center"
        tooltip={`${entry.presetName} · ${tallyLabel}`}
      >
        <ClipboardList />
        <div className="grid min-w-0 flex-1 text-left leading-tight">
          <span className="truncate font-medium">{entry.presetName}</span>
          <span className="truncate text-xs text-sidebar-foreground/70">
            {new Date(entry.savedAt).toLocaleString()}
          </span>
          <span className="truncate text-xs font-medium tabular-nums text-sidebar-foreground/80">
            {tallyLabel}
            {ancLabel}
          </span>
        </div>
      </SidebarMenuButton>
      <SidebarMenuAction
        showOnHover
        aria-label={`Delete ${entry.presetName} count`}
        onClick={onDelete}
      >
        <Trash2 />
      </SidebarMenuAction>
      <details className="group-data-[collapsible=icon]:hidden mb-2 ml-8 mr-2 open:border-t open:border-sidebar-border open:pt-1.5">
        <summary className="cursor-pointer rounded-sm text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/50 focus-visible:outline-none">
          Details
        </summary>
        <ul className="mt-1 space-y-0.5 text-xs tabular-nums text-sidebar-foreground/80">
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
