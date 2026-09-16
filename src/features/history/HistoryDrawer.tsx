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
import { useCounter } from "@/features/counter/CounterProvider";

export function HistorySidebar() {
  const ctx = useCounter();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="relative border-b border-sidebar-border">
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Save count" onClick={ctx.saveCountToHistory}>
                <Plus />
                <span>Save count</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="hidden shrink-0 md:flex group-data-[collapsible=icon]:hidden" />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none" tooltip="History">
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <History className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">History</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  Local · anonymous
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Saved counts</SidebarGroupLabel>
          <SidebarGroupContent>
            {ctx.history.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                No saved counts yet. Snapshots stay on this device and do not
                include patient identifiers.
              </p>
            ) : (
              <SidebarMenu>
                {ctx.history.map((entry) => (
                  <SidebarMenuItem key={entry.id}>
                    <SidebarMenuButton
                      className="h-auto items-start py-2 group-data-[collapsible=icon]:items-center"
                      tooltip={`${entry.presetName} · ${entry.tally}/${entry.maxWBC}`}
                    >
                      <ClipboardList />
                      <div className="grid min-w-0 flex-1 text-left leading-tight">
                        <span className="truncate font-medium">{entry.presetName}</span>
                        <span className="truncate text-xs text-sidebar-foreground/70">
                          {new Date(entry.savedAt).toLocaleString()}
                        </span>
                        <span className="truncate text-xs text-sidebar-foreground/70">
                          {entry.tally}/{entry.maxWBC}
                          {entry.anc != null ? ` · ANC ${entry.anc}` : ""}
                        </span>
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      aria-label={`Delete ${entry.presetName} count`}
                      onClick={() => ctx.deleteHistoryEntry(entry.id)}
                    >
                      <Trash2 />
                    </SidebarMenuAction>
                    <details className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
                      <summary className="cursor-pointer text-xs text-sidebar-foreground/70">
                        Details
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-xs text-sidebar-foreground/80">
                        {entry.rows.map((r) => (
                          <li key={r.cell}>
                            {r.cell}: {r.count}
                            {r.ignore ? " (ignore)" : ` · ${r.relative}%`}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </SidebarMenuItem>
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
