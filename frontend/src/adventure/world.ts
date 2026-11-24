import type { Mission, ZoneId } from './types';

/* Sarguzasht dunyosi: chapdan o'ngga zonalar ketma-ketligi.
   [boshlanish] [1-missiya zonasi] |darvoza| [2-missiya zonasi] |darvoza| ... [xazina]
   Har bir zona orasida devor bor, faqat yo'ldagi darvoza missiya bajarilgach ochiladi. */

export const TILE = 56;
export const H = 15;
const START_W = 9;
const ZONE_W = 17;
const END_W = 11;

export type Theme = {
  ground: [string, string]; path: string; edge: string;
  solid: string[]; soft: string[]; wall: string[];
};

export const THEMES: Record<ZoneId | 'start' | 'end', Theme> = {
  start: { ground: ['#9BD77B', '#93CF73'], path: '#E9D7A4', edge: '#D8C38A', solid: ['🌳'], soft: ['🌼', '🌷'], wall: ['🌳'] },
  meadow: { ground: ['#98D676', '#90CE6E'], path: '#EAD7A2', edge: '#D7C188', solid: ['🌳', '🌳', '🪨'], soft: ['🌼', '🌷', '🌻', '🦋'], wall: ['🌳'] },
  forest: { ground: ['#5FAE5C', '#58A655'], path: '#C9A979', edge: '#B4935F', solid: ['🌲', '🌳', '🌲'], soft: ['🍄', '🌿', '🐿️'], wall: ['🌲'] },
  desert: { ground: ['#EDCF8C', '#E6C783'], path: '#D6AC66', edge: '#C29550', solid: ['🌵', '🪨', '🌵'], soft: ['🌾', '🐪'], wall: ['🌵'] },
  snow: { ground: ['#EEF4FA', '#E4EDF5'], path: '#BED1E3', edge: '#A6BDD3', solid: ['🌲', '⛄', '🌲'], soft: ['❄️', '🐧'], wall: ['🌲'] },
  beach: { ground: ['#F4E2AB', '#EEDA9F'], path: '#E4C687', edge: '#D2B06D', solid: ['🌴', '🪨', '🌴'], soft: ['🐚', '🦀', '⭐'], wall: ['🌴'] },
  village: { ground: ['#A3D57F', '#9BCD77'], path: '#CFC8B8', edge: '#B9B1A0', solid: ['🏠', '🏡', '🌳'], soft: ['🌻', '🐔', '🐈'], wall: ['🌳'] },
  mountain: { ground: ['#AEBB9F', '#A6B397'], path: '#C8BBA0', edge: '#B0A386', solid: ['🪨', '⛰️', '🌲'], soft: ['🌿', '🐐'], wall: ['⛰️'] },
  candy: { ground: ['#F8CBDF', '#F4C1D8'], path: '#FFF1B8', edge: '#F2DC8C', solid: ['🍭', '🧁', '🍭'], soft: ['🍬', '🍩', '🍪'], wall: ['🍭'] },
  end: { ground: ['#B9E39B', '#B1DB93'], path: '#F3DC9A', edge: '#DDC27A', solid: ['🌳'], soft: ['🌼', '🎈', '🌷'], wall: ['🌳'] },
};

export type Deco = { x: number; y: number; e: string; solid: boolean };
export type Npc = { k: number; x: number; y: number };
export type Gate = { k: number; x: number; y: number };

export type World = {
  W: number; H: number;
  zoneOf: (x: number) => { theme: Theme; k: number };   // k: -1 boshlanish, n — xazina
  path: Set<string>;
  water: (x: number, y: number) => boolean;
  decos: Deco[];
  solidAt: Map<string, Deco>;
  npcs: Npc[];
  gates: Gate[];
  coins: { x: number; y: number; id: string }[];
  spawn: { x: number; y: number };
  chest: { x: number; y: number };
  pathY: (x: number) => number;
};

function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const key = (x: number, y: number) => `${x},${y}`;

export function buildWorld(code: string, missions: Mission[]): World {
  const n = missions.length;
  const W = START_W + n * ZONE_W + END_W;
  const r = rng(hash(code));
  const zoneStart = (k: number) => START_W + k * ZONE_W;
  const wallX = (k: number) => zoneStart(k) + ZONE_W - 1; // k-zonaning oxirgi ustuni — devor

  const zoneOf = (x: number) => {
    if (x < START_W) return { theme: THEMES.start, k: -1 };
    const k = Math.floor((x - START_W) / ZONE_W);
    if (k >= n) return { theme: THEMES.end, k: n };
    return { theme: THEMES[missions[k].zone] ?? THEMES.meadow, k };
  };

  // Yo'l: o'rtada to'lqinsimon chiziq
  const phase = r() * 6;
  const pathY = (x: number) => Math.round(H / 2 + Math.sin(x / 4.3 + phase) * 2.2);
  const path = new Set<string>();
  for (let x = 1; x < W - 1; x++) {
    const y = pathY(x), y2 = pathY(x + 1);
    for (let yy = Math.min(y, y2); yy <= Math.max(y, y2); yy++) path.add(key(x, yy));
  }
  const water = (x: number, y: number) => y <= 0 || y >= H - 1 || x <= 0 || x >= W - 1;

  const npcs: Npc[] = missions.map((_, k) => {
    const x = zoneStart(k) + 8;
    const py = pathY(x);
    return { k, x, y: py <= H / 2 ? py + 2 : py - 2 };
  });
  const gates: Gate[] = missions.map((_, k) => ({ k, x: wallX(k), y: pathY(wallX(k)) }));
  const chest = { x: W - 5, y: pathY(W - 5) };
  const spawn = { x: 3, y: pathY(3) };

  const decos: Deco[] = [];
  const solidAt = new Map<string, Deco>();
  const busy = new Set<string>();
  const reserve = (x: number, y: number, rad = 1) => { for (let dx = -rad; dx <= rad; dx++) for (let dy = -rad; dy <= rad; dy++) busy.add(key(x + dx, y + dy)); };
  npcs.forEach((p) => reserve(p.x, p.y, 1));
  reserve(chest.x, chest.y, 1);
  reserve(spawn.x, spawn.y, 1);
  const put = (x: number, y: number, e: string, solid: boolean) => {
    const d = { x, y, e, solid };
    decos.push(d);
    if (solid) solidAt.set(key(x, y), d);
    busy.add(key(x, y));
  };

  // Zonalar orasidagi devorlar (darvozadan tashqari); darvoza oldi va orqasi bo'sh qoladi
  gates.forEach((g) => reserve(g.x, g.y, 1));
  gates.forEach((g) => {
    const th = zoneOf(g.x).theme;
    for (let y = 1; y < H - 1; y++) {
      if (y === g.y) continue;
      if (path.has(key(g.x, y))) { put(g.x, y, '🪨', true); continue; }
      put(g.x, y, th.wall[0], true);
    }
    busy.add(key(g.x, g.y));
  });

  // Bezaklar
  for (let x = 1; x < W - 1; x++) {
    for (let y = 1; y < H - 1; y++) {
      const kk = key(x, y);
      if (busy.has(kk) || path.has(kk)) continue;
      const nearPath = [-1, 0, 1].some((d) => path.has(key(x, y + d)));
      const th = zoneOf(x).theme;
      const v = r();
      if (!nearPath && v < 0.13) put(x, y, th.solid[Math.floor(r() * th.solid.length)], true);
      else if (v > 0.93) put(x, y, th.soft[Math.floor(r() * th.soft.length)], false);
    }
  }

  // Tangalar: har zonada 4 ta, yo'ldan uzoq emas
  const coins: World['coins'] = [];
  for (let k = -1; k < n; k++) {
    const x0 = k < 0 ? 2 : zoneStart(k) + 1, x1 = k < 0 ? START_W - 1 : wallX(k) - 1;
    let tries = 0, placed = 0;
    while (placed < (k < 0 ? 2 : 4) && tries++ < 80) {
      const x = x0 + Math.floor(r() * (x1 - x0));
      const y = pathY(x) + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 3));
      const kk = key(x, y);
      if (y < 1 || y > H - 2 || busy.has(kk) || solidAt.has(kk)) continue;
      coins.push({ x, y, id: kk });
      busy.add(kk);
      placed++;
    }
  }

  return { W, H, zoneOf, path, water, decos, solidAt, npcs, gates, coins, spawn, chest, pathY };
}

/** Bu katakdan yurish mumkinmi (yopiq darvozalar hisobga olinadi) */
export function walkable(w: World, x: number, y: number, done: boolean[]) {
  if (x < 0 || y < 0 || x >= w.W || y >= w.H || w.water(x, y)) return false;
  const k = key(x, y);
  if (w.solidAt.has(k)) return false;
  const g = w.gates.find((gg) => gg.x === x && gg.y === y);
  if (g && !done[g.k]) return false;
  if (w.npcs.some((p) => p.x === x && p.y === y)) return false;
  if (w.chest.x === x && w.chest.y === y) return false;
  return true;
}

/** Bosilgan katakkacha eng qisqa yo'l (BFS) */
export function findPath(w: World, from: { x: number; y: number }, to: { x: number; y: number }, done: boolean[]) {
  const sx = Math.floor(from.x), sy = Math.floor(from.y);
  // Nishon yurib bo'lmaydigan joy bo'lsa (masalan NPC), yonidagi bo'sh katakka boramiz
  let tx = to.x, ty = to.y;
  if (!walkable(w, tx, ty, done)) {
    const near = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]
      .map(([dx, dy]) => ({ x: tx + dx, y: ty + dy }))
      .filter((p) => walkable(w, p.x, p.y, done))
      .sort((a, b) => Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy))[0];
    if (!near) return null;
    tx = near.x; ty = near.y;
  }
  const prev = new Map<string, string>();
  const q: [number, number][] = [[sx, sy]];
  const seen = new Set([key(sx, sy)]);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === tx && y === ty) {
      const out: { x: number; y: number }[] = [];
      let c = key(x, y);
      while (c !== key(sx, sy)) {
        const [cx, cy] = c.split(',').map(Number);
        out.unshift({ x: cx + 0.5, y: cy + 0.5 });
        c = prev.get(c)!;
      }
      return out;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, kk = key(nx, ny);
      if (seen.has(kk) || !walkable(w, nx, ny, done)) continue;
      seen.add(kk); prev.set(kk, key(x, y)); q.push([nx, ny]);
    }
  }
  return null;
}
