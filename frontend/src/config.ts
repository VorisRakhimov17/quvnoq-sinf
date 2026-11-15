// Sotuv sozlamalari: narxlar va bog'lanish ma'lumotlari shu yerda o'zgartiriladi.

/** Kredit paketlari (1 kredit = 1 AI o'yin) */
export const PACKAGES = [
  { credits: 10, price: 15_000 },
  { credits: 30, price: 39_000, best: true },
  { credits: 100, price: 119_000 },
];

/** Kredit sotib olish uchun bog'lanish (bo'sh qatorlar ko'rsatilmaydi) */
export const CONTACT = {
  telegram: '', // masalan: 'quvnoqsinf' (@ belgisisiz)
  phone: '',    // masalan: '+998 90 123 45 67'
};

export const formatSum = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' so‘m';
