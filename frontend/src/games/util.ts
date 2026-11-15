import type { Option } from './types';

export const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export function shuffle<T>(a: readonly T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export const toOpts = (arr: readonly string[], text = false): Option[] =>
  arr.map((v) => ({ v, label: v, text }));

/** To'g'ri javob atrofida 4 ta son varianti */
export function numOpts(ans: number): Option[] {
  const set = new Set([ans]);
  const steps = ans >= 100 ? [1, 10, 2, 20, 100, 5] : ans >= 20 ? [1, 10, 2, 5, 3] : [1, 2, 3];
  for (let g = 0; set.size < 4 && g < 60; g++) {
    const v = ans + pick(steps) * (Math.random() < 0.5 ? -1 : 1);
    if (v >= 0) set.add(v);
  }
  for (let k = 1; set.size < 4; k++) set.add(ans + k);
  return toOpts(shuffle([...set]).map(String));
}
