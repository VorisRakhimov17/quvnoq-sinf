import type { ChoiceQ } from './types';
import { pick, shuffle } from './util';

const HAB: Record<string, [string, string]> = {
  orm: ['🌲', 'O‘rmon'], suv: ['🌊', 'Suv'], chol: ['🏜️', 'Cho‘l'], qutb: ['🧊', 'Muzlik'], uy: ['🏡', 'Ferma'],
};

/** [rasm, nomi, yashash joyi, qisqa ma'lumot] */
const ANIMALS: [string, string, string, string][] = [
  ['🐻', 'Ayiq', 'orm', 'Ayiq o‘rmonda yashaydi, qishda inida uxlaydi.'],
  ['🦊', 'Tulki', 'orm', 'Tulki o‘rmon va dalalarda in qazib yashaydi.'],
  ['🐺', 'Bo‘ri', 'orm', 'Bo‘rilar o‘rmonda to‘da bo‘lib yashaydi.'],
  ['🦌', 'Bug‘u', 'orm', 'Bug‘ular o‘rmonda o‘t va barglar bilan oziqlanadi.'],
  ['🐿️', 'Olmaxon', 'orm', 'Olmaxon daraxt kovagida yashaydi va yong‘oq g‘amlaydi.'],
  ['🦉', 'Boyqush', 'orm', 'Boyqush tunda ov qiladigan o‘rmon qushi.'],
  ['🐟', 'Baliq', 'suv', 'Baliq suvda jabrasi bilan nafas oladi.'],
  ['🐋', 'Kit', 'suv', 'Kit okeanda yashaydi, u eng katta hayvon.'],
  ['🐬', 'Delfin', 'suv', 'Delfin dengizda yashaydi va juda aqlli.'],
  ['🐙', 'Sakkizoyoq', 'suv', 'Sakkizoyoqning 8 ta oyog‘i bor, u dengiz tubida yashaydi.'],
  ['🦈', 'Akula', 'suv', 'Akula dengiz va okeanlarda yashaydi.'],
  ['🐪', 'Tuya', 'chol', 'Tuya cho‘lda ko‘p kun suv ichmasdan yura oladi.'],
  ['🦎', 'Kaltakesak', 'chol', 'Kaltakesak issiq qumli cho‘lda yashaydi.'],
  ['🦂', 'Chayon', 'chol', 'Chayon cho‘lda tosh ostida yashaydi.'],
  ['🐧', 'Pingvin', 'qutb', 'Pingvinlar Antarktidaning muzli qirg‘oqlarida yashaydi.'],
  ['🐻‍❄️', 'Oq ayiq', 'qutb', 'Oq ayiq Shimoliy qutb muzliklarida yashaydi.'],
  ['🦭', 'Tyulen', 'qutb', 'Tyulen sovuq dengiz va muzliklarda yashaydi.'],
  ['🐄', 'Sigir', 'uy', 'Sigir fermada boqiladi va bizga sut beradi.'],
  ['🐔', 'Tovuq', 'uy', 'Tovuq hovlida yashaydi va tuxum qo‘yadi.'],
  ['🐑', 'Qo‘y', 'uy', 'Qo‘y fermada boqiladi, undan jun olinadi.'],
  ['🐐', 'Echki', 'uy', 'Echki hovlida boqiladi va sut beradi.'],
  ['🐴', 'Ot', 'uy', 'Ot fermada boqiladi va odamlarga yordam beradi.'],
];

export function genYashash(): ChoiceQ {
  const [emoji, name, h, fact] = pick(ANIMALS);
  const keys = shuffle([h, ...shuffle(Object.keys(HAB).filter((k) => k !== h)).slice(0, 3)]);
  return {
    kind: 'choice', key: name, ask: `${name} qayerda yashaydi?`, visual: { type: 'pic', emoji },
    options: keys.map((k) => ({ v: k, label: `${HAB[k][0]} ${HAB[k][1]}`, text: true })),
    answer: h, answerLabel: HAB[h][1], explain: fact,
  };
}

const SEASONS: Record<string, [string, string, string]> = {
  qish: ['❄️', 'Qish', 'Qish: dekabr, yanvar, fevral. Havo sovuq, qor yog‘adi.'],
  bahor: ['🌷', 'Bahor', 'Bahor: mart, aprel, may. Navro‘z keladi, gullar ochiladi.'],
  yoz: ['☀️', 'Yoz', 'Yoz: iyun, iyul, avgust. Havo issiq, mevalar pishadi.'],
  kuz: ['🍂', 'Kuz', 'Kuz: sentabr, oktabr, noyabr. Barglar sarg‘ayadi, hosil yig‘iladi.'],
};
const SEASON_ITEMS: [string, string, string][] = [
  ['☃️', 'Qor odam', 'qish'], ['🎿', 'Chang‘i', 'qish'], ['🧤', 'Qo‘lqop va sharf', 'qish'], ['🎄', 'Yangi yil archasi', 'qish'],
  ['🌷', 'Lola', 'bahor'], ['🌸', 'Gullagan o‘rik', 'bahor'], ['🌱', 'Yangi maysa', 'bahor'], ['🐣', 'Jo‘ja', 'bahor'],
  ['🍉', 'Tarvuz', 'yoz'], ['🏖️', 'Suv bo‘yida dam olish', 'yoz'], ['🍦', 'Muzqaymoq', 'yoz'], ['🌻', 'Kungaboqar', 'yoz'],
  ['🍁', 'Sarg‘aygan barglar', 'kuz'], ['🍇', 'Uzum yig‘imi', 'kuz'], ['🎒', 'Maktabga qaytish', 'kuz'], ['🎃', 'Qovoq', 'kuz'],
];

export function genFasl(): ChoiceQ {
  const [emoji, name, s] = pick(SEASON_ITEMS);
  return {
    kind: 'choice', key: name, ask: `${name} qaysi faslga xos?`, visual: { type: 'pic', emoji },
    options: ['qish', 'bahor', 'yoz', 'kuz'].map((k) => ({ v: k, label: `${SEASONS[k][0]} ${SEASONS[k][1]}`, text: true })),
    answer: s, answerLabel: SEASONS[s][1], explain: SEASONS[s][2],
  };
}

const KINDS: Record<string, [string, string, string]> = {
  hayvon: ['🐾', 'Hayvon', 'Hayvonlar nafas oladi, oziqlanadi, harakatlanadi va o‘sadi.'],
  osimlik: ['🌿', 'O‘simlik', 'O‘simliklar ham tirik: ular o‘sadi, suv ichadi va quyosh nuridan oziq oladi.'],
  jonsiz: ['🪨', 'Jonsiz narsa', 'Jonsiz narsalar o‘smaydi, nafas olmaydi va oziqlanmaydi.'],
};
const KIND_ITEMS: [string, string, string][] = [
  ['🐱', 'Mushuk', 'hayvon'], ['🐝', 'Ari', 'hayvon'], ['🐢', 'Toshbaqa', 'hayvon'], ['🦋', 'Kapalak', 'hayvon'],
  ['🐸', 'Qurbaqa', 'hayvon'], ['🐘', 'Fil', 'hayvon'], ['🐌', 'Shilliqqurt', 'hayvon'],
  ['🌳', 'Daraxt', 'osimlik'], ['🌵', 'Kaktus', 'osimlik'], ['🌻', 'Kungaboqar', 'osimlik'], ['🌾', 'Bug‘doy', 'osimlik'],
  ['🌷', 'Lola', 'osimlik'], ['🍀', 'Beda', 'osimlik'],
  ['🪨', 'Tosh', 'jonsiz'], ['🚗', 'Mashina', 'jonsiz'], ['📖', 'Kitob', 'jonsiz'], ['⏰', 'Soat', 'jonsiz'],
  ['✏️', 'Qalam', 'jonsiz'], ['☁️', 'Bulut', 'jonsiz'], ['🧸', 'O‘yinchoq ayiq', 'jonsiz'], ['🤖', 'Robot', 'jonsiz'],
];

export function genTirik(): ChoiceQ {
  const [emoji, name, k] = pick(KIND_ITEMS);
  return {
    kind: 'choice', key: name, ask: `${name}: bu nima?`, visual: { type: 'pic', emoji },
    options: Object.keys(KINDS).map((x) => ({ v: x, label: `${KINDS[x][0]} ${KINDS[x][1]}`, text: true })),
    answer: k, answerLabel: KINDS[k][1], explain: KINDS[k][2],
  };
}
