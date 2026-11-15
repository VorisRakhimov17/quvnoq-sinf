import type { ChoiceQ, Grade } from './types';
import { numOpts, pick, rnd, shuffle, toOpts } from './util';

export function genHisob(g: Grade): ChoiceQ {
  let a: number, b: number, op: string, ans = 0;
  if (g === 1) {
    if (Math.random() < 0.5) { op = '+'; a = rnd(0, 9); b = rnd(1, 10 - a); }
    else { op = '−'; a = rnd(2, 10); b = rnd(1, a); }
  } else if (g === 2) {
    if (Math.random() < 0.5) { op = '+'; a = rnd(11, 79); b = rnd(5, 99 - a); }
    else { op = '−'; a = rnd(25, 99); b = rnd(5, a - 5); }
  } else if (g === 3) {
    if (Math.random() < 0.6) { op = '×'; a = rnd(2, 9); b = rnd(2, 9); }
    else { op = '÷'; b = rnd(2, 9); ans = rnd(2, 9); a = b * ans; }
  } else {
    const r = Math.random();
    if (r < 0.3) { op = '+'; a = rnd(120, 780); b = rnd(110, 999 - a); }
    else if (r < 0.55) { op = '−'; a = rnd(300, 999); b = rnd(100, a - 50); }
    else if (r < 0.8) { op = '×'; a = rnd(12, 49); b = rnd(2, 9); }
    else { op = '÷'; b = rnd(2, 9); ans = rnd(11, 30); a = b * ans; }
  }
  if (op === '+') ans = a + b;
  else if (op === '−') ans = a - b;
  else if (op === '×') ans = a * b;
  return {
    kind: 'choice', key: `${a}${op}${b}`, ask: 'Hisoblang',
    visual: { type: 'expr', text: `${a} ${op} ${b} = {?}` },
    options: numOpts(ans), answer: String(ans),
  };
}

const COUNT_EMO = ['🍎', '⭐', '🐟', '🌸', '🎈', '🐥', '🍓', '🦋', '🍐', '🐞'];

export function genSanash(g: Grade): ChoiceQ {
  const emoji = pick(COUNT_EMO);
  if (g <= 2) {
    const n = g === 1 ? rnd(2, 10) : rnd(8, 20);
    return {
      kind: 'choice', key: emoji + n, ask: 'Nechta?',
      visual: { type: 'pile', emoji, n }, options: numOpts(n), answer: String(n),
    };
  }
  const rows = g === 3 ? rnd(2, 5) : rnd(3, 6);
  const cols = g === 3 ? rnd(2, 6) : rnd(4, 9);
  const n = rows * cols;
  return {
    kind: 'choice', key: `${emoji}${rows}x${cols}`, ask: 'Nechta?',
    askNote: `${rows} ta qator, har birida ${cols} tadan`,
    visual: { type: 'grid', emoji, rows, cols },
    options: numOpts(n), answer: String(n), explain: `${rows} × ${cols} = ${n}`,
  };
}

export function genTaqqos(g: Grade): ChoiceQ {
  let L: string, R: string, lv: number, rv: number, note = '';
  const eq = Math.random() < 0.2;
  if (g <= 2) {
    const max = g === 1 ? 20 : 100;
    lv = rnd(0, max);
    rv = eq ? lv : rnd(0, max);
    if (!eq && rv === lv) rv = lv + 1;
    L = String(lv); R = String(rv);
  } else if (g === 3 || Math.random() < 0.5) {
    let a: number, b: number, op: string;
    if (g === 3) {
      if (Math.random() < 0.6) { op = '×'; a = rnd(2, 9); b = rnd(2, 9); lv = a * b; }
      else { op = '+'; a = rnd(15, 60); b = rnd(10, 39); lv = a + b; }
    } else if (Math.random() < 0.5) { op = '×'; a = rnd(12, 40); b = rnd(2, 9); lv = a * b; }
    else { op = '+'; a = rnd(150, 600); b = rnd(120, 399); lv = a + b; }
    rv = eq ? lv : lv + pick(g === 3 ? [-3, -2, -1, 1, 2, 3] : [-20, -10, -1, 1, 10, 20]);
    L = `${a} ${op} ${b}`; R = String(rv); note = `${L} = ${lv}`;
  } else {
    lv = rnd(1000, 9999);
    let s = String(lv);
    for (let t = 0; t < 10; t++) {
      const c = shuffle(String(lv).split('')).join('');
      if (c[0] !== '0') { s = c; break; }
    }
    rv = eq ? lv : Number(s);
    if (!eq && rv === lv) rv = lv + 10 > 9999 ? lv - 10 : lv + 10;
    L = String(lv); R = String(rv);
  }
  const ans = lv < rv ? '<' : lv > rv ? '>' : '=';
  return {
    kind: 'choice', key: `${L}|${R}`, ask: 'Qaysi belgi qo‘yiladi?',
    visual: { type: 'expr', text: `${L} {?} ${R}` },
    options: toOpts(['<', '=', '>']), answer: ans,
    explain: `${L} ${ans} ${R}` + (note ? ` (chunki ${note})` : ''),
  };
}
