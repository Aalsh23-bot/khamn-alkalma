import { haptic } from "@/lib/native";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC({ latencyHint: "interactive" });
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    ctx = null;
    master = null;
    return null;
  }
}

export function unlockAudio() {
  getCtx();
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08) {
  if (!enabled) return;
  try {
    const ac = getCtx();
    if (!ac || !master) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(g);
    g.connect(master);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
    osc.onended = () => {
      try {
        osc.disconnect();
        g.disconnect();
      } catch {
        /* already gone */
      }
    };
  } catch {
    ctx = null;
    master = null;
  }
}

export function sfxType() {
  beep(420 + Math.random() * 40, 0.05, "triangle", 0.04);
  void haptic("light");
}

export function sfxDelete() {
  beep(240, 0.06, "sine", 0.03);
  void haptic("light");
}

export function sfxError() {
  beep(160, 0.16, "square", 0.05);
  void haptic("warning");
}

export function sfxFlip(i: number) {
  beep(380 + i * 70, 0.08, "triangle", 0.05);
  if (i === 0) void haptic("medium");
}

export function sfxWin() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((n, i) => {
    window.setTimeout(() => beep(n, 0.18, "sine", 0.07), i * 90);
  });
  void haptic("success");
}

export function sfxLose() {
  beep(196, 0.28, "sine", 0.06);
  window.setTimeout(() => beep(147, 0.35, "sine", 0.05), 160);
  void haptic("error");
}
