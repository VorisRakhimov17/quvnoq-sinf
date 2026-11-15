export type Grade = 1 | 2 | 3 | 4;
export type SubjectId = 'math' | 'lang' | 'nature';

/** Savolning "rasm" qismi. Matndagi {?} bo'sh katak sifatida chiziladi. */
export type Visual =
  | { type: 'expr'; text: string }
  | { type: 'pic'; emoji: string; word?: string }
  | { type: 'pile'; emoji: string; n: number }
  | { type: 'grid'; emoji: string; rows: number; cols: number }
  | { type: 'text'; text: string; emoji?: string };

export type Option = { v: string; label: string; text?: boolean };

type Base = {
  key: string;
  ask: string;
  askNote?: string;
  visual: Visual;
  answerLabel?: string;
  explain?: string;
  /** Unli harflari ajratib ko'rsatiladigan so'z (izohda) */
  vowelWord?: string;
};

export type ChoiceQ = Base & { kind: 'choice'; options: Option[]; answer: string };
export type BuildQ = Base & { kind: 'build'; answer: string[]; tiles: string[] };
export type Question = ChoiceQ | BuildQ;

export type GameDef = {
  id: string;
  subject: SubjectId;
  title: string;
  sample: string;
  desc: (g: Grade) => string;
  /** Avtomatik savol yaratuvchi. custom o'yinlarda bo'lmaydi. */
  gen?: (g: Grade) => Question;
  /** O'qituvchi bazaga qo'shgan savollardan o'ynaladi */
  custom?: boolean;
};
