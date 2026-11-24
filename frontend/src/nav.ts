/** Kabinet bo'limlari: yon menyu, telefondagi pastki menyu va yuqori menyu shu ro'yxatdan */
export const SECTIONS = [
  { id: 'panel', icon: '🏠', label: 'Bosh panel', short: 'Panel' },
  { id: 'oyin', icon: '🎮', label: 'O‘yinlar', short: 'O‘yinlar' },
  { id: 'prezentatsiya', icon: '🎬', label: 'Prezentatsiyalar', short: 'Slaydlar' },
  { id: 'sarguzasht', icon: '🗺️', label: 'Sarguzashtlar', short: 'Sarguzasht' },
  { id: 'results', icon: '📊', label: 'Natijalar', short: 'Natijalar' },
  { id: 'questions', icon: '✏️', label: 'Mening savollarim', short: 'Savollar' },
  { id: 'kredit', icon: '💎', label: 'Kreditlar', short: 'Kredit' },
] as const;
export type SectionId = (typeof SECTIONS)[number]['id'];
export const sectionLink = (id: SectionId) => (id === 'panel' ? '/kabinet' : `/kabinet?tab=${id}`);
