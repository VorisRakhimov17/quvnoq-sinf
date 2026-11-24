import type { CSSProperties } from 'react';
import type { FontId, Palette, Theme } from './types';

/** Har bir uslub uchun sarlavha va matn shrifti (Google Fonts) */
export const FONTS: Record<FontId, { title: string; body: string; weight: number }> = {
  baloo: { title: '"Baloo 2"', body: 'Nunito', weight: 800 },
  fredoka: { title: 'Fredoka', body: 'Nunito', weight: 700 },
  rubik: { title: 'Rubik', body: 'Rubik', weight: 800 },
  comfortaa: { title: 'Comfortaa', body: 'Nunito', weight: 700 },
  patrick: { title: '"Patrick Hand"', body: '"Patrick Hand"', weight: 400 },
  bungee: { title: 'Bungee', body: 'Rubik', weight: 400 },
  grandstander: { title: 'Grandstander', body: 'Nunito', weight: 800 },
};

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Rubik:wght@500;600;700;800' +
  '&family=Comfortaa:wght@600;700&family=Patrick+Hand&family=Bungee&family=Grandstander:wght@600;800&display=swap';

/** Prezentatsiya shriftlarini bir marta yuklaydi (bosh sahifani og'irlashtirmaslik uchun) */
export function loadDeckFonts() {
  if (document.getElementById('deck-fonts')) return;
  const l = document.createElement('link');
  l.id = 'deck-fonts';
  l.rel = 'stylesheet';
  l.href = FONT_URL;
  document.head.appendChild(l);
}

/* ---------- Rang kontrasti: AI tanlagan ranglar o'qilmasa, tuzatamiz ---------- */

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** fon ustida eng yaxshi o'qiladigan rang: berilgan rang yetarli bo'lmasa, qora yoki oq */
export function readable(on: string, preferred: string, min = 4.5) {
  if (contrast(on, preferred) >= min) return preferred;
  return contrast(on, '#14141F') >= contrast(on, '#FFFFFF') ? '#14141F' : '#FFFFFF';
}

export function themeVars(t: Theme): CSSProperties {
  const p: Palette = t.palette;
  const f = FONTS[t.font] ?? FONTS.baloo;
  const ink = readable(p.bg, p.ink);
  const surfaceInk = readable(p.surface, p.ink);
  return {
    '--bg': p.bg,
    '--surface': p.surface,
    '--primary': p.primary,
    '--secondary': p.secondary,
    '--accent': p.accent,
    '--ink': ink,
    '--sink': surfaceInk,
    '--on-primary': readable(p.primary, '#FFFFFF'),
    '--on-secondary': readable(p.secondary, '#FFFFFF'),
    '--on-accent': readable(p.accent, '#FFFFFF'),
    '--title-font': `${f.title}, "Baloo 2", system-ui, sans-serif`,
    '--body-font': `${f.body}, Nunito, system-ui, sans-serif`,
    '--title-weight': f.weight,
  } as CSSProperties;
}

/* ---------- Urug'li tasodif: bir slayd har safar bir xil ko'rinadi, lekin slaydlar bir-biridan farq qiladi ---------- */

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
