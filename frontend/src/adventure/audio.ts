/* Sarguzasht ovozlari: hammasi Web Audio bilan "sintez" qilinadi, fayl yuklanmaydi.
   Effektlar va fon musiqasi alohida yoqib-o'chiriladi; tanlov brauzerda eslab qolinadi. */

let ctx: AudioContext | null = null;
let fxGain: GainNode | null = null;
let musicGain: GainNode | null = null;

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    fxGain = ctx.createGain();
    fxGain.gain.value = 0.9;
    fxGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function tone(f: number, at: number, dur: number, type: OscillatorType, vol: number, out: GainNode, slide?: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.02);
}

const read = (k: string, d: boolean) => {
  try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; }
};
const write = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* saqlanmasa ham ishlaydi */ } };

let fxOn = read('adv:sfx', true);
export const sfxEnabled = () => fxOn;
export function setSfx(on: boolean) { fxOn = on; write('adv:sfx', on); }

/** Bitta effekt: ichida xato bo'lsa ham o'yin to'xtamaydi */
function play(f: (t: number, out: GainNode) => void) {
  if (!fxOn) return;
  try { const c = ac(); f(c.currentTime + 0.01, fxGain!); } catch { /* ovozsiz davom etamiz */ }
}

export const sfx = {
  coin: () => play((t, o) => { tone(hz(88), t, 0.08, 'square', 0.08, o); tone(hz(95), t + 0.07, 0.22, 'square', 0.08, o); }),
  find: () => play((t, o) => [79, 84, 88, 91].forEach((n, i) => tone(hz(n), t + i * 0.06, 0.18, 'triangle', 0.18, o))),
  ok: () => play((t, o) => [72, 76, 79, 84].forEach((n, i) => tone(hz(n), t + i * 0.08, 0.25, 'triangle', 0.2, o))),
  bad: () => play((t, o) => { tone(hz(59), t, 0.22, 'sine', 0.22, o, hz(55)); tone(hz(55), t + 0.18, 0.32, 'sine', 0.2, o, hz(50)); }),
  pop: () => play((t, o) => tone(900, t, 0.09, 'sine', 0.25, o, 180)),
  star: (i: number) => play((t, o) => tone(hz(76 + i * 2), t, 0.3, 'triangle', 0.18, o)),
  gate: () => play((t, o) => { tone(hz(48), t, 0.4, 'sawtooth', 0.06, o, hz(60)); [67, 71, 74, 79].forEach((n, i) => tone(hz(n), t + 0.15 + i * 0.07, 0.3, 'triangle', 0.15, o)); }),
  buy: () => play((t, o) => { tone(hz(84), t, 0.1, 'square', 0.07, o); tone(hz(91), t + 0.09, 0.1, 'square', 0.07, o); tone(hz(96), t + 0.18, 0.3, 'triangle', 0.15, o); }),
  talk: () => play((t, o) => { tone(hz(74), t, 0.07, 'triangle', 0.12, o); tone(hz(79), t + 0.07, 0.1, 'triangle', 0.12, o); }),
  fanfare: () => play((t, o) => {
    const seq: [number, number, number][] = [[67, 0, 0.15], [67, 0.15, 0.15], [67, 0.3, 0.15], [72, 0.45, 0.6], [76, 1.05, 0.2], [79, 1.25, 0.8]];
    seq.forEach(([n, d, l]) => { tone(hz(n), t + d, l + 0.1, 'triangle', 0.2, o); tone(hz(n - 12), t + d, l + 0.1, 'square', 0.04, o); });
  }),
};

/* ---------- Fon musiqasi: quvnoq pentatonik kuy, cheksiz takrorlanadi ---------- */

const _ = 0;
// 8-lik notalar (MIDI raqamlari), 0 — pauza. 8 takt.
const MELODY = [
  72, _, 76, _, 79, _, 76, _, 77, _, 81, _, 79, _, _, _,
  76, _, 79, _, 84, _, 81, _, 79, _, 77, _, 76, _, _, _,
  74, _, 77, _, 81, _, 77, _, 76, _, 79, _, 84, _, _, _,
  81, 79, 77, 76, 74, _, 72, _, 74, _, 76, _, 72, _, _, _,
];
const BASS = [48, 53, 48, 55, 50, 48, 53, 48]; // har 8 qadamda bitta
const STEP = 60 / 118 / 2; // 118 BPM, 8-lik

let musicOn = read('adv:music', true);
let timer: ReturnType<typeof setInterval> | undefined;
let nextAt = 0;
let stepNo = 0;

export const musicEnabled = () => musicOn;

function schedule() {
  const c = ctx!;
  while (nextAt < c.currentTime + 0.35) {
    const i = stepNo % MELODY.length;
    const n = MELODY[i];
    if (n) tone(hz(n), nextAt, STEP * 1.6, 'triangle', 0.5, musicGain!);
    if (i % 8 === 0) {
      const b = BASS[(i / 8) % BASS.length];
      tone(hz(b), nextAt, STEP * 3.5, 'sine', 0.7, musicGain!);
    }
    if (i % 4 === 2) tone(hz(b2(i)), nextAt, STEP * 0.9, 'sine', 0.25, musicGain!);
    nextAt += STEP;
    stepNo++;
  }
}
const b2 = (i: number) => BASS[Math.floor(i / 8) % BASS.length] + 19;

/** Musiqani o'yin davomida yoqish/o'chirish (start — o'yin sahifasi ochiq) */
export function music(play: boolean) {
  try {
    if (!play || !musicOn) {
      if (ctx && musicGain) musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
      clearInterval(timer);
      timer = undefined;
      return;
    }
    const c = ac();
    musicGain!.gain.setTargetAtTime(0.06, c.currentTime, 0.4);
    if (!timer) {
      nextAt = c.currentTime + 0.1;
      timer = setInterval(schedule, 100);
      schedule();
    }
  } catch { /* ovozsiz davom etamiz */ }
}

export function setMusic(on: boolean, playing: boolean) {
  musicOn = on;
  write('adv:music', on);
  music(playing);
}
