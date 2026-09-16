let ctx: AudioContext | null = null;
let loop: ReturnType<typeof setInterval> | null = null;
let playing = false;

function audio() {
  ctx ??= new AudioContext();
  return ctx;
}

export async function unlockTimerAudio() {
  const ac = audio();
  if (ac.state === "suspended") await ac.resume();
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, gain = 0.08) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playTimerChime() {
  if (playing) return;
  const ac = audio();
  if (ac.state === "suspended") {
    void ac.resume().then(() => playTimerChime());
    return;
  }
  playing = true;
  const t = ac.currentTime;
  tone(ac, 880, t, 0.18, 0.09);
  tone(ac, 1174, t + 0.2, 0.28, 0.1);
  window.setTimeout(() => {
    playing = false;
  }, 520);
}

export function startDoneChime(muted: boolean) {
  if (muted) {
    stopDoneChime();
    return;
  }
  if (loop) return;
  playTimerChime();
  loop = setInterval(() => {
    playTimerChime();
  }, 1600);
}

export function stopDoneChime() {
  if (loop) {
    clearInterval(loop);
    loop = null;
  }
}
