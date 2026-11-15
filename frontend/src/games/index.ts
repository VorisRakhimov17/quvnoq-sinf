import { LEVEL, genBogin, genHarf, genSoz } from './lang';
import { genHisob, genSanash, genTaqqos } from './math';
import { genFasl, genTirik, genYashash } from './nature';
import type { GameDef, Grade, SubjectId } from './types';

export const SUBJECTS: Record<SubjectId, { name: string; color: string }> = {
  math: { name: 'Matematika', color: 'var(--math)' },
  lang: { name: 'Ona tili va o‘qish', color: 'var(--lang)' },
  nature: { name: 'Tabiatshunoslik', color: 'var(--nature)' },
};

const by = (m: Record<Grade, string>) => (g: Grade) => m[g];

export const GAMES: GameDef[] = [
  { id: 'hisob', subject: 'math', title: 'Tez hisob', sample: '7 + 5 = ?', gen: genHisob,
    desc: by({ 1: '10 gacha qo‘shish va ayirish', 2: '100 gacha qo‘shish va ayirish', 3: 'Ko‘paytirish jadvali va bo‘lish', 4: 'Ko‘p xonali sonlar bilan amallar' }) },
  { id: 'sanash', subject: 'math', title: 'Sanab ko‘r', sample: '🍎🍎🍎🍎', gen: genSanash,
    desc: by({ 1: 'Rasmdagi narsalarni sanash (10 gacha)', 2: '20 gacha sanash', 3: 'Qator va ustunlar: ko‘paytirib sanash', 4: 'Katta guruhlarni ko‘paytirib sanash' }) },
  { id: 'taqqos', subject: 'math', title: 'Katta, kichik, teng', sample: '8 ? 5', gen: genTaqqos,
    desc: by({ 1: '20 gacha sonlarni solishtirish', 2: '100 gacha sonlarni solishtirish', 3: 'Ifoda va sonni solishtirish', 4: 'Ko‘p xonali sonlar va ifodalar' }) },
  { id: 'harf', subject: 'lang', title: 'Harfni top', sample: 'ol?a', gen: genHarf,
    desc: (g) => `So‘zdagi tushib qolgan harfni toping. ${g}-sinf: ${LEVEL[g]}` },
  { id: 'soz', subject: 'lang', title: 'So‘z tuz', sample: 't·i·k·o·b', gen: genSoz,
    desc: (g) => `Aralash harflardan so‘z yig‘ing. ${g}-sinf: ${LEVEL[g]}` },
  { id: 'bogin', subject: 'lang', title: 'Bo‘g‘inni sana', sample: 'ki-tob', gen: genBogin,
    desc: () => 'So‘zda nechta bo‘g‘in borligini aniqlang' },
  { id: 'yashash', subject: 'nature', title: 'Kim qayerda yashaydi?', sample: '🐧 → 🧊', gen: genYashash,
    desc: () => 'Hayvonni yashash joyi bilan moslang: o‘rmon, suv, cho‘l, muzlik, ferma' },
  { id: 'fasl', subject: 'nature', title: 'To‘rt fasl', sample: '❄️🌷☀️🍂', gen: genFasl,
    desc: () => 'Rasm qaysi faslga tegishli ekanini toping' },
  { id: 'tirik', subject: 'nature', title: 'Tirik va jonsiz', sample: '🌳 🐱 🪨', gen: genTirik,
    desc: () => 'Hayvon, o‘simlik yoki jonsiz narsa ekanini ajrating' },
  ...(['math', 'lang', 'nature'] as SubjectId[]).map<GameDef>((s) => ({
    id: `mening-${s}`, subject: s, title: 'Mening savollarim', sample: '✍️', custom: true,
    desc: (g) => `O‘qituvchi kabinetida ${g}-sinf uchun qo‘shilgan savollar`,
  })),
];

export const gameTitle = (id: string) => GAMES.find((g) => g.id === id)?.title ?? id;
