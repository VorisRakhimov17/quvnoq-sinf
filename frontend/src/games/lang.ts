import type { BuildQ, ChoiceQ, Grade } from './types';
import { pick, rnd, shuffle, toOpts } from './util';

/** [so'z, rasm] — yangi so'z qo'shish uchun shu ro'yxatga yozing */
const WORDS: [string, string][] = [
  ['olma', '🍎'], ['uzum', '🍇'], ['it', '🐶'], ['mushuk', '🐱'], ['qush', '🐦'], ['baliq', '🐟'],
  ['quyosh', '☀️'], ['oy', '🌙'], ['yulduz', '⭐'], ['gul', '🌸'], ['daraxt', '🌳'], ['kitob', '📖'],
  ['qalam', '✏️'], ['uy', '🏠'], ['mashina', '🚗'], ['sigir', '🐄'], ['ot', '🐴'], ['tovuq', '🐔'],
  ['quyon', '🐰'], ['ayiq', '🐻'], ['sher', '🦁'], ['fil', '🐘'], ['tarvuz', '🍉'], ['non', '🍞'],
  ['sut', '🥛'], ['soat', '⌚'], ['kalit', '🔑'], ['to‘p', '⚽'], ['shar', '🎈'], ['qor', '❄️'],
  ['bulut', '☁️'], ['tuxum', '🥚'], ['limon', '🍋'], ['nok', '🍐'], ['sabzi', '🥕'], ['pomidor', '🍅'],
  ['kema', '🚢'], ['avtobus', '🚌'], ['eshik', '🚪'], ['qoshiq', '🥄'], ['maktab', '🏫'],
  ['toshbaqa', '🐢'], ['ari', '🐝'], ['kapalak', '🦋'], ['ilon', '🐍'], ['tulki', '🦊'],
  ['bo‘ri', '🐺'], ['echki', '🐐'], ['qo‘y', '🐑'], ['tuya', '🐪'], ['maymun', '🐒'],
  ['kompyuter', '💻'], ['televizor', '📺'], ['velosiped', '🚲'], ['qulupnay', '🍓'],
  ['kartoshka', '🥔'], ['samolyot', '✈️'], ['qo‘ziqorin', '🍄'], ['sichqon', '🐭'], ['qurbaqa', '🐸'],
];

const DIGRAPHS = ['o‘', 'g‘', 'sh', 'ch'];
export const VOWELS = ['a', 'e', 'i', 'o', 'u', 'o‘'];
const CONS = ['b', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'x', 'y', 'z', 'g‘', 'sh', 'ch'];

/** So'zni o'zbek harflariga ajratadi: "qo‘ziqorin" → q, o‘, z, i, q, o, r, i, n */
export function units(w: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < w.length; ) {
    const two = w.slice(i, i + 2);
    if (DIGRAPHS.includes(two)) { out.push(two); i += 2; }
    else { out.push(w[i]); i++; }
  }
  return out;
}

const RANGE: Record<Grade, [number, number]> = { 1: [2, 4], 2: [3, 5], 3: [4, 7], 4: [5, 99] };
export const LEVEL: Record<Grade, string> = { 1: 'qisqa so‘zlar', 2: '3–5 harfli so‘zlar', 3: 'uzunroq so‘zlar', 4: 'uzun so‘zlar' };

function wordsFor(g: Grade) {
  const [a, b] = RANGE[g];
  return WORDS.filter(([w]) => { const n = units(w).length; return n >= a && n <= b; });
}

export function genHarf(g: Grade): ChoiceQ {
  const [w, emoji] = pick(wordsFor(g));
  const u = units(w);
  const idx = rnd(0, u.length - 1);
  const ans = u[idx];
  const pool = (VOWELS.includes(ans) ? VOWELS : CONS).filter((x) => x !== ans);
  return {
    kind: 'choice', key: w + idx, ask: 'Qaysi harf tushib qolgan?',
    visual: { type: 'pic', emoji, word: u.map((x, i) => (i === idx ? '{?}' : x)).join('') },
    options: toOpts(shuffle([ans, ...shuffle(pool).slice(0, 3)])), answer: ans,
    explain: `So‘z: ${w}`,
  };
}

export function genSoz(g: Grade): BuildQ {
  const [w, emoji] = pick(wordsFor(g));
  const u = units(w);
  let tiles = shuffle(u);
  for (let k = 0; k < 10 && u.length > 1 && tiles.join('') === u.join(''); k++) tiles = shuffle(u);
  return {
    kind: 'build', key: w, ask: 'Harflardan so‘z tuzing',
    visual: { type: 'pic', emoji }, answer: u, tiles, answerLabel: w,
  };
}

export function genBogin(g: Grade): ChoiceQ {
  const [w, emoji] = pick(wordsFor(g));
  const n = units(w).filter((x) => VOWELS.includes(x)).length;
  return {
    kind: 'choice', key: w, ask: 'Bu so‘zda nechta bo‘g‘in bor?',
    visual: { type: 'pic', emoji, word: w },
    options: toOpts((g <= 2 ? [1, 2, 3, 4] : [1, 2, 3, 4, 5]).map(String)), answer: String(n),
    vowelWord: w, explain: `Unli harflar soni = bo‘g‘inlar soni: ${n} ta`,
  };
}
