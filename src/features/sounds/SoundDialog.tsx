import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SoundWaveform } from "@/features/sounds/SoundWaveform";
import { playTrackPreview, preloadSounds, resumeAudio } from "@/features/sounds/soundEngine";
import { useCounter } from "@/features/counter/CounterProvider";
import { TRACK_COUNT } from "@/lib/types";

const trackControlClass =
  "h-11 w-12 flex-col gap-0.5 px-0 py-1 leading-none";

export function SoundDialog() {
  const { soundSettings, updateSounds } = useCounter();
  const [open, setOpen] = useState(false);

  const preview = (channel: "max" | "change", track: number) => {
    void preloadSounds().then(async () => {
      await resumeAudio();
      playTrackPreview(track, channel);
    });
  };

  const cycle = (channel: "max" | "change", dir: -1 | 1) => {
    const track = (soundSettings[channel].track + dir + TRACK_COUNT) % TRACK_COUNT;
    updateSounds({
      ...soundSettings,
      [channel]: { ...soundSettings[channel], track },
    });
    preview(channel, track);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9">Settings</Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,28rem)]">
        <DialogHeader>
          <DialogTitle>Sound settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {(["max", "change"] as const).map((channel) => {
            const enabled = soundSettings[channel].play;
            const switchId = `sound-${channel}`;
            return (
              <div
                key={channel}
                className="relative overflow-hidden rounded-md border border-border"
              >
                <SoundWaveform channel={channel} />
                <div className="relative z-10 grid gap-2.5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium capitalize">{channel} count</p>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={switchId} className="text-xs text-muted-foreground">
                        Sound {enabled ? "on" : "off"}
                      </Label>
                      <Switch
                        id={switchId}
                        checked={enabled}
                        onCheckedChange={(v) =>
                          updateSounds({
                            ...soundSettings,
                            [channel]: { ...soundSettings[channel], play: Boolean(v) },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Track {soundSettings[channel].track + 1}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={trackControlClass}
                        onClick={() => cycle(channel, -1)}
                      >
                        <ChevronLeft className="size-3.5" aria-hidden="true" />
                        <span className="text-xs font-medium">Prev</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={trackControlClass}
                        onClick={() => cycle(channel, 1)}
                      >
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                        <span className="text-xs font-medium">Next</span>
                      </Button>
                      <Button
                        size="sm"
                        className={trackControlClass}
                        onClick={() => preview(channel, soundSettings[channel].track)}
                      >
                        <Play className="size-3.5 fill-current" aria-hidden="true" />
                        <span className="text-xs font-medium">Play</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
