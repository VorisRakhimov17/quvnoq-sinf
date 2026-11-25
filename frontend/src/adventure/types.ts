/** Sarguzasht ma'lumotlari (backend adventures.module.ts dagi clean() bilan bir xil) */
export type ZoneId = 'meadow' | 'forest' | 'desert' | 'snow' | 'beach' | 'village' | 'mountain' | 'candy';
/** match: options = "chap|o'ng" juftlari */
export type Task = { kind: 'choice' | 'truefalse' | 'order' | 'match'; question: string; options: string[]; answer: string; explain: string };
export type Mission = {
  topic: string; title: string; zone: ZoneId; npcName: string; npcEmoji: string;
  story: string; success: string; rewardName: string; rewardEmoji: string; tasks: Task[];
};
export type AdventureData = { title: string; intro: string; goal: string; finale: string; missions: Mission[] };
export type PublicAdventure = { code: string; title: string; grade: number; data: AdventureData };

export type AdventureRow = {
  id: number; code: string; title: string; grade: number; topics: string[]; createdAt: string; players: number; missions: number;
};
export type LeaderRow = { name: string; avatar: string; stars: number; coins: number; missions: number; finished: boolean; updatedAt: string };

/** O'quvchining brauzerda saqlanadigan holati */
export type Save = {
  playerId: string; name: string; avatar: string;
  stars: number[];      // har bir missiyadagi eng yaxshi yulduzlar (0–5)
  done: boolean[];      // missiya bajarildimi
  coins: number;
  taken: string[];      // yig'ilgan tangalar ("x,y")
  pos?: { x: number; y: number };
  spent?: number;       // do'konda sarflangan tangalar (reytingda jami tanga = coins + spent)
  owned?: string[];     // sotib olingan / yutilgan narsalar (shop.ts dagi id)
  hat?: string;         // kiyilgan shapka id
  pet?: string;         // ergashib yuruvchi do'st id
  quest?: { k: number; got: string[] } | null; // yo'qolgan buyumlarni qidirish
};
