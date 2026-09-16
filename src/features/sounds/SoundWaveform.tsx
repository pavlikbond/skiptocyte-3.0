import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  getPreviewAnalyser,
  getPreviewState,
  subscribePreview,
  type SoundChannel,
} from "@/features/sounds/soundEngine";

type Props = {
  channel: SoundChannel;
  className?: string;
};

export function SoundWaveform({ channel, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeData = new Uint8Array(1024);
    let raf = 0;
    let energy = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { width, height } = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const color = () =>
      getComputedStyle(canvas).getPropertyValue("--primary").trim() ||
      "oklch(0.42 0.1 236)";

    const draw = () => {
      if (!running) return;
      resize();

      const live =
        getPreviewState()?.channel === channel ? getPreviewAnalyser() : null;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!live) {
        energy = 0;
        raf = 0;
        return;
      }

      energy = Math.min(1, energy + 0.45);

      const hue = color();
      const mid = h * 0.62;
      const amp = h * 0.48 * energy;
      const dpr = window.devicePixelRatio || 1;

      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const state = getPreviewState();
      if (!reduced) {
        live.getByteTimeDomainData(timeData);
      }

      let peak = 0;
      if (!reduced) {
        for (let i = 0; i < timeData.length; i++) {
          peak = Math.max(peak, Math.abs(timeData[i] - 128) / 128);
        }
      }

      ctx.beginPath();
      const steps = Math.min(180, Math.max(48, w));
      const cycles = 3 + ((state?.track ?? 0) % 4);
      const phase = performance.now() / 70;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let sample = 0;
        if (!reduced) {
          if (peak > 0.08) {
            const idx = Math.min(
              timeData.length - 1,
              Math.floor(t * (timeData.length - 1)),
            );
            sample = (timeData[idx] - 128) / 128;
          } else {
            sample =
              Math.sin(t * Math.PI * cycles * 2 - phase) * Math.sin(t * Math.PI);
          }
        }
        const x = t * w;
        const y = mid + sample * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = hue;
      ctx.globalAlpha = energy;
      ctx.lineWidth = (1.4 + energy * 2) * dpr;
      ctx.shadowColor = hue;
      ctx.shadowBlur = reduced ? 0 : 6 + energy * 28;
      ctx.stroke();

      if (!reduced) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = energy * 0.22;
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = hue;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };

    const kick = () => {
      if (!running) return;
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (!raf && energy < 0.04) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
      }
    });
    ro.observe(canvas);
    resize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const unsub = subscribePreview(kick);
    return () => {
      running = false;
      unsub();
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [channel]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
