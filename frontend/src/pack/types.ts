/** AI tayyorlagan o'yinlar to'plami (backend packs.module.ts dagi clean() natijasi bilan bir xil) */
export type QuizItem = { question: string; emoji: string; options: string[]; answer: string; explain: string };
export type TFItem = { statement: string; emoji: string; isTrue: boolean; explain: string };
export type PackData = {
  title: string;
  emoji: string;
  quiz: QuizItem[];
  truefalse: TFItem[];
  pairs: { title: string; items: { left: string; right: string }[] };
  sort: { title: string; groups: { name: string; emoji: string }[]; items: { text: string; group: number }[] };
  order: { title: string; steps: string[] }[];
};
export type GamePackRow = {
  id: number; subject: 'math' | 'lang' | 'nature'; grade: number; topic: string; title: string; createdAt: string; emoji: string;
};
export type GamePack = Omit<GamePackRow, 'emoji'> & { data: PackData };

export type PackGameId = 'quiz' | 'truefalse' | 'pairs' | 'sort' | 'order';
