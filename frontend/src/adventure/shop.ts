import type { ZoneId } from './types';

/** Tanlanadigan qahramonlar */
export const HEROES: { e: string; name: string }[] = [
  { e: '🧒', name: 'Bola' }, { e: '👧', name: 'Qizcha' }, { e: '👦', name: 'O‘g‘il bola' }, { e: '🦊', name: 'Tulki' },
  { e: '🐼', name: 'Panda' }, { e: '🐯', name: 'Yo‘lbars' }, { e: '🐸', name: 'Qurbaqa' }, { e: '🤖', name: 'Robot' },
  { e: '🐰', name: 'Quyon' }, { e: '🦁', name: 'Sher' }, { e: '🐨', name: 'Koala' }, { e: '🦄', name: 'Yolqinli ot' },
];

export type Item = { id: string; e: string; name: string; price: number; slot: 'hat' | 'pet'; prize?: boolean };

/** Do'kon: tangaga olinadi. prize — faqat xazinadan yutiladi */
export const SHOP: Item[] = [
  { id: 'cap', e: '🧢', name: 'Kepka', price: 6, slot: 'hat' },
  { id: 'bow', e: '🎀', name: 'Bantik', price: 6, slot: 'hat' },
  { id: 'flower', e: '🌸', name: 'Gulcha', price: 8, slot: 'hat' },
  { id: 'tophat', e: '🎩', name: 'Shlyapa', price: 14, slot: 'hat' },
  { id: 'grad', e: '🎓', name: 'Bilimdon qalpog‘i', price: 22, slot: 'hat' },
  { id: 'crown', e: '👑', name: 'Oltin toj', price: 0, slot: 'hat', prize: true },
  { id: 'chick', e: '🐥', name: 'Jo‘ja', price: 10, slot: 'pet' },
  { id: 'dog', e: '🐶', name: 'Kuchukcha', price: 15, slot: 'pet' },
  { id: 'cat', e: '🐱', name: 'Mushukcha', price: 15, slot: 'pet' },
  { id: 'turtle', e: '🐢', name: 'Toshbaqa', price: 18, slot: 'pet' },
  { id: 'dragon', e: '🐲', name: 'Ajdarcha', price: 30, slot: 'pet' },
];
export const item = (id?: string) => SHOP.find((s) => s.id === id);

/** Har bir yulduz uchun missiyada beriladigan tanga (faqat oldingi natijadan oshgan qismi) */
export const COINS_PER_STAR = 2;

/** Zonalarda yo'qolgan buyumlar (qidirish topshirig'i) */
export const LOST: Record<ZoneId, { e: string; name: string }> = {
  meadow: { e: '🍎', name: 'olma' },
  forest: { e: '🌰', name: 'yong‘oq' },
  desert: { e: '💎', name: 'qimmatbaho tosh' },
  snow: { e: '🧤', name: 'qo‘lqop' },
  beach: { e: '🏐', name: 'koptok' },
  village: { e: '🥚', name: 'tuxum' },
  mountain: { e: '🔔', name: 'qo‘ng‘iroqcha' },
  candy: { e: '🍒', name: 'gilos' },
};
export const LOST_COUNT = 3;

/** Yakuniy medal: yig'ilgan yulduzlar ulushi bo'yicha */
export function medal(stars: number, max: number) {
  const r = max ? stars / max : 0;
  if (r >= 0.9) return { e: '🥇', name: 'Oltin medal' };
  if (r >= 0.7) return { e: '🥈', name: 'Kumush medal' };
  return { e: '🥉', name: 'Bronza medal' };
}
