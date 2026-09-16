import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCounter } from "@/features/counter/CounterProvider";
import { dbRowsToLive, liveToDb } from "@/lib/storage";
import { presetFileSchema } from "@/lib/schemas";

function safeFilename(name: string) {
  return (
    name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ") || "preset"
  );
}

export function ImportExport() {
  const ctx = useCounter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ReturnType<typeof dbRowsToLive>[] | null>(null);

  const exportPreset = () => {
    const blob = new Blob(
      [JSON.stringify({ presets: liveToDb(ctx.presets) }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skiptocyte-${safeFilename(ctx.preset.name)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    try {
      const parsed = presetFileSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        window.alert("That file is not a valid preset list.");
        return;
      }
      setPending(parsed.data.presets.map(dbRowsToLive));
    } catch {
      window.alert("That file is not a valid preset list.");
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9">
            Import / export preset
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={exportPreset}>Export preset</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            Import preset
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={pending != null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import presets</AlertDialogTitle>
            <AlertDialogDescription>
              Add these to your current list, or replace your presets entirely?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (pending) ctx.mergePresets(pending);
                setPending(null);
              }}
            >
              Add to list
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (pending) ctx.replacePresets(pending);
                setPending(null);
              }}
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
