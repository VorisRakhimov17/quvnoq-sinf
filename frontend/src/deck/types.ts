/** AI tayyorlagan prezentatsiya tuzilishi (backend presentations.module.ts dagi DeckSchema bilan bir xil) */
export type Palette = { bg: string; surface: string; primary: string; secondary: string; accent: string; ink: string };
export type FontId = 'baloo' | 'fredoka' | 'rubik' | 'comfortaa' | 'patrick' | 'bungee' | 'grandstander';
export type Motif = 'dots' | 'stars' | 'waves' | 'confetti' | 'bubbles' | 'leaves' | 'zigzag' | 'clouds' | 'shapes' | 'grid';
export type Motion = 'slide' | 'zoom' | 'flip' | 'rise' | 'pop';
export type Shape = 'rounded' | 'blob' | 'sharp' | 'sticker';

export type Theme = { styleName: string; palette: Palette; font: FontId; motif: Motif; motion: Motion; shape: Shape };
export type Mascot = { emoji: string; name: string; role: string };
type Point = { emoji: string; text: string };

export type Slide = { notes: string } & (
  | { type: 'cover'; title: string; subtitle: string; emoji: string; art: string }
  | { type: 'hook'; question: string; emoji: string; reveal: string }
  | { type: 'story'; title: string; lines: { who: string; emoji: string; text: string }[]; art: string }
  | { type: 'bigIdea'; text: string; highlight: string; emoji: string; art: string }
  | { type: 'explain'; title: string; points: Point[]; art: string }
  | { type: 'steps'; title: string; steps: { title: string; text: string }[] }
  | { type: 'example'; title: string; problem: string; steps: string[]; result: string }
  | { type: 'compare'; title: string; left: Side; right: Side }
  | { type: 'facts'; title: string; cards: { emoji: string; title: string; text: string }[] }
  | { type: 'quiz'; question: string; emoji: string; options: string[]; answer: string; explain: string }
  | { type: 'activity'; title: string; instruction: string; emoji: string; seconds: number }
  | { type: 'summary'; title: string; points: Point[] }
  | { type: 'ending'; title: string; text: string; emoji: string }
);
type Side = { title: string; emoji: string; items: string[] };

export type Deck = { title: string; theme: Theme; mascot: Mascot; slides: Slide[] };

export type PresentationRow = {
  id: number; subject: 'math' | 'lang' | 'nature'; grade: number; topic: string; title: string; style: string;
  createdAt: string; slides: number; palette?: Palette; emoji: string;
};
export type Presentation = Omit<PresentationRow, 'slides' | 'palette' | 'emoji'> & { deck: Deck };
