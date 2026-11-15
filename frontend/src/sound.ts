let ctx: AudioContext | null = null;

/** To'g'ri javobda ko'tariluvchi, xatoda pasayuvchi qisqa ohang */
export function beep(ok: boolean) {
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    const notes = ok ? [523.25, 659.25, 783.99] : [246.94, 196];
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      const t = now + i * 0.11;
      o.type = ok ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch {
    /* ovoz ishlamasa o'yin davom etaveradi */
  }
}
