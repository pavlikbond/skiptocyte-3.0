import type { SoundSettings } from "@/lib/types";
import { TRACK_COUNT } from "@/lib/types";

export type SoundChannel = "max" | "change";

type PreviewState = {
  track: number;
  channel: SoundChannel | null;
} | null;

const rawBuffers: ArrayBuffer[] = [];
const decoded: AudioBuffer[] = [];
const previewListeners = new Set<() => void>();

let audioCtx: AudioContext | null = null;
let previewAnalyser: AnalyserNode | null = null;
let previewSource: AudioBufferSourceNode | null = null;
let previewGeneration = 0;
let previewState: PreviewState = null;
let loading: Promise<void> | null = null;

export function getPreviewState() {
  return previewState;
}

export function getPreviewAnalyser() {
  return previewAnalyser;
}

export function subscribePreview(listener: () => void) {
  previewListeners.add(listener);
  return () => {
    previewListeners.delete(listener);
  };
}

function notifyPreview() {
  previewListeners.forEach((fn) => fn());
}

function setPreview(next: PreviewState) {
  previewState = next;
  notifyPreview();
}

async function loadRaw() {
  if (rawBuffers.length === TRACK_COUNT) return;
  const buffers = await Promise.all(
    Array.from({ length: TRACK_COUNT }, async (_, i) => {
      const res = await fetch(`/sounds/Beep_${i + 1}.mp3`);
      return res.arrayBuffer();
    }),
  );
  rawBuffers.length = 0;
  rawBuffers.push(...buffers);
}

async function ensureContext() {
  let task = loading;
  if (!task) {
    task = (async () => {
      await loadRaw();
      audioCtx ??= new AudioContext();
      if (!previewAnalyser) {
        previewAnalyser = audioCtx.createAnalyser();
        previewAnalyser.fftSize = 1024;
        previewAnalyser.smoothingTimeConstant = 0.28;
        previewAnalyser.connect(audioCtx.destination);
      }
      if (audioCtx.state === "suspended") await audioCtx.resume();
      if (decoded.length !== TRACK_COUNT) {
        decoded.length = 0;
        for (const raw of rawBuffers) {
          decoded.push(await audioCtx.decodeAudioData(raw.slice(0)));
        }
      }
    })().finally(() => {
      loading = null;
    });
    loading = task;
  }
  await task;
}

export async function preloadSounds() {
  await loadRaw();
}

export async function resumeAudio() {
  await ensureContext();
}

function stopPreview() {
  if (!previewSource) return;
  previewSource.onended = null;
  try {
    previewSource.stop();
  } catch {
    /* already stopped */
  }
  previewSource.disconnect();
  previewSource = null;
}

function playBuffer(index: number, previewChannel: SoundChannel | null) {
  if (!audioCtx || !previewAnalyser) return;
  const buffer = decoded[Math.min(TRACK_COUNT - 1, Math.max(0, index))];
  if (!buffer) return;

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  if (previewChannel) {
    const generation = ++previewGeneration;
    stopPreview();
    source.connect(previewAnalyser);
    previewSource = source;
    setPreview({ track: index, channel: previewChannel });
    source.onended = () => {
      if (generation !== previewGeneration) return;
      previewSource = null;
      setPreview(null);
    };
  } else {
    source.connect(audioCtx.destination);
  }

  source.start();
}

export function playChannel(channel: SoundChannel, settings: SoundSettings) {
  const spec = settings[channel];
  if (!spec.play) return;
  void ensureContext().then(() => playBuffer(spec.track, null));
}

export function playTrackPreview(track: number, channel: SoundChannel) {
  void ensureContext().then(() => playBuffer(track, channel));
}
