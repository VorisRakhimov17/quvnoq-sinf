import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import {
  BadGatewayException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Subject } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { z } from 'zod';
import { SUBJECT_NAMES, aiError } from '../ai/ai.module';
import { JwtAuthGuard, TeacherId } from '../auth/jwt.guard';
import { CreditsService } from '../credits/credits.module';
import { PrismaService } from '../prisma/prisma.service';

/** Bitta prezentatsiya narxi (kreditda). AI javobi o'yindan bir necha barobar uzun. */
export const PRESENTATION_COST = 3;
const DAILY_LIMIT = 15;

const SIZES = { short: [8, 10], normal: [12, 14], long: [16, 18] } as const;
type Size = keyof typeof SIZES;

export class GenerateDeckDto {
  @IsIn(['math', 'lang', 'nature']) subject: Subject;
  @IsInt() @Min(1) @Max(4) grade: number;
  @IsString() @Length(2, 200, { message: 'Mavzu 2–200 belgi bo‘lsin' }) topic: string;
  @IsIn(Object.keys(SIZES)) size: Size;
  @IsOptional() @IsString() @MaxLength(400) wishes?: string;
}

/* ---------- AI javobi sxemasi ----------
 * Grammatika kichik bo'lishi uchun AI tekis (flat) slayd qaytaradi; keyin toSlide() aniq turlarga o'giradi.
 * Frontend turlari: frontend/src/deck/types.ts */

const Hex = z.string().describe('#RRGGBB');

const RawSlide = z.object({
  type: z.enum(['cover', 'hook', 'story', 'bigIdea', 'explain', 'steps', 'example', 'compare', 'facts', 'quiz', 'activity', 'summary', 'ending']),
  title: z.string(),
  text: z.string(),
  emoji: z.string(),
  items: z.array(z.object({ emoji: z.string(), title: z.string(), text: z.string() })),
  options: z.array(z.string()),
  answer: z.string(),
  seconds: z.number().int(),
  art: z.string(),
  notes: z.string(),
});

const RawDeck = z.object({
  title: z.string(),
  theme: z.object({
    styleName: z.string(),
    palette: z.object({ bg: Hex, surface: Hex, primary: Hex, secondary: Hex, accent: Hex, ink: Hex }),
    font: z.enum(['baloo', 'fredoka', 'rubik', 'comfortaa', 'patrick', 'bungee', 'grandstander']),
    motif: z.enum(['dots', 'stars', 'waves', 'confetti', 'bubbles', 'leaves', 'zigzag', 'clouds', 'shapes', 'grid']),
    motion: z.enum(['slide', 'zoom', 'flip', 'rise', 'pop']),
    shape: z.enum(['rounded', 'blob', 'sharp', 'sticker']),
  }),
  mascot: z.object({ emoji: z.string(), name: z.string(), role: z.string() }),
  slides: z.array(RawSlide),
});
type Raw = z.infer<typeof RawDeck>;
type RawS = z.infer<typeof RawSlide>;

type Item = { emoji: string; title: string; text: string };
type Side = { title: string; emoji: string; items: string[] };
type DeckSlide = { notes: string } & (
  | { type: 'cover'; title: string; subtitle: string; emoji: string; art: string }
  | { type: 'hook'; question: string; emoji: string; reveal: string }
  | { type: 'story'; title: string; lines: { who: string; emoji: string; text: string }[]; art: string }
  | { type: 'bigIdea'; text: string; highlight: string; emoji: string; art: string }
  | { type: 'explain'; title: string; points: { emoji: string; text: string }[]; art: string }
  | { type: 'steps'; title: string; steps: { title: string; text: string }[] }
  | { type: 'example'; title: string; problem: string; steps: string[]; result: string }
  | { type: 'compare'; title: string; left: Side; right: Side }
  | { type: 'facts'; title: string; cards: Item[] }
  | { type: 'quiz'; question: string; emoji: string; options: string[]; answer: string; explain: string }
  | { type: 'activity'; title: string; instruction: string; emoji: string; seconds: number }
  | { type: 'summary'; title: string; points: { emoji: string; text: string }[] }
  | { type: 'ending'; title: string; text: string; emoji: string }
);
type Deck = Omit<Raw, 'slides'> & { slides: DeckSlide[] };

/* ---------- Takrorlanmaslik uchun ijodiy yo'nalishlar ---------- */

const FRAMES = [
  'a space mission: the class is the crew of a rocket, every part of the lesson is a planet to visit',
  'a detective investigation: a mystery that the class solves clue by clue using the lesson',
  'a journey through a magical forest with talking animals',
  'an underwater expedition in a submarine',
  'a cooking show: the lesson is a recipe prepared step by step',
  'a museum tour with a curious guide who shows exhibits',
  'a time machine trip to different eras',
  'a superhero training academy where each skill is a new power',
  'a TV news broadcast with a reporter and live reports',
  'a treasure hunt on an island with a map and locked chests',
  'a friendly robot factory where robots learn new things',
  'a sports championship with rounds and a final',
  'an Uzbek folk tale with a kind, clever hero (in the spirit of ertaklar)',
  'an inventor’s laboratory with experiments',
  'a caravan journey along the Silk Road through Samarqand, Buxoro and Xiva',
  'a jungle safari with a jeep and binoculars',
  'a circus show where every act teaches something',
  'a weather station and sky observatory',
  'a dinosaur park with a friendly paleontologist',
  'a train trip with stops at stations',
];
const MOODS = [
  'warm sunset (orange, coral, deep plum)',
  'neon night (dark navy with electric cyan and pink)',
  'pastel candy (soft pink, mint, lemon)',
  'earthy natural (olive, sand, terracotta)',
  'bold primary (red, blue, yellow on white)',
  'ocean cool (teal, aqua, deep blue)',
  'retro 70s (mustard, brown, orange, cream)',
  'ice and snow (white, pale blue, silver, a touch of violet)',
  'jungle (emerald, lime, bright parrot colours)',
  'royal (purple, gold, cream)',
  'chalkboard (dark green board with chalk white and pastel chalk colours)',
  'paper craft (kraft paper, cut-paper colours)',
  'space dark (near-black violet with starlight yellow)',
  'spring garden (fresh green, blossom pink, sky blue)',
];

/** Oxirgi prezentatsiyalarda ishlatilmaganini tasodifiy tanlaydi */
function pick(list: string[], avoid: string[]) {
  const fresh = list.filter((x) => !avoid.some((a) => a && x.startsWith(a)));
  const pool = fresh.length ? fresh : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

const SYSTEM = `You are an award-winning designer and primary-school teacher who builds lesson slide decks for grades 1–4
in Uzbekistan. The teacher shows the deck on a classroom projector and teaches the lesson with it, so the deck must
actually TEACH the topic: hook the children, explain the idea clearly, show worked examples, let them practise, check
understanding, and sum up.

Language: Uzbek, Latin script, current official orthography. Write o‘ and g‘ with ‘ (U+2018) and the tutuq belgisi
with ’ (U+2019), e.g. "ma’no". Short sentences and words a child of the given grade knows. Slide text is read from
across the room: keep every text short (titles ≤ 45 characters, points ≤ 90, dialogue lines ≤ 110).

Creative direction:
- Build the whole deck around the given story frame and a mascot so it feels like one adventure, not a template.
  The mascot guides the children and appears in dialogue and activities.
- Pick colours that match the mood hint. "ink" must be very readable on "bg" and on "surface" (strong contrast);
  "primary", "secondary" and "accent" must differ clearly from each other and from "bg".
- Choose font, motif, motion and card shape that fit the world.
- Vary the slide types: use at least 7 different types, never the same type twice in a row (except quiz).
  Start with "cover", then "hook" or "story". End with "summary" and then "ending".
  Include 2–3 "quiz" slides spread through the deck and one "activity" (a short movement or pair game).
- For maths, "example" slides must show the real calculation steps; double-check every number.
- Facts must be correct and appropriate for the national primary curriculum.

Every slide has the same fields; fill the ones its type uses and leave the rest empty ("" / [] / 0):
- cover: title, text = subtitle, emoji, art (always draw art here).
- hook: title = an intriguing question or riddle, text = the answer revealed after the children guess, emoji.
- story: title, items = 2–4 dialogue lines {emoji of the speaker, title = speaker name, text = what they say}, art optional.
- bigIdea: text = one memorable sentence, answer = a word or short phrase copied exactly from text to highlight, emoji, art optional.
- explain: title, items = 2–4 points {emoji, text} (title empty), art optional.
- steps: title, items = 3–5 steps {title, text} (emoji empty).
- example: title, text = the problem, items = the solution steps {text} (emoji and title empty), answer = the result.
- compare: title, items = exactly 2 sides {emoji, title, text = 2–4 short items, one per line separated by \\n}.
- facts: title ("Bilasizmi?" style), items = 3–6 cards {emoji, title, text}.
- quiz: title = the question, emoji, options = exactly 4 short options (all different, one correct),
  answer = the correct option copied exactly, text = one friendly sentence explaining why.
- activity: title, text = clear instruction for the class, emoji, seconds = 30–90.
- summary: title, items = 3–5 key points {emoji, text}.
- ending: title, text = a warm closing line, emoji.
- emoji fields hold exactly one emoji (no text). notes: what the teacher can say or ask (not shown to children).

Illustrations ("art"): draw 3–5 original flat illustrations in total, on the slides where a picture helps most
(always on the cover). Each is one inline SVG: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">…</svg>,
only basic shapes, paths, gradients and groups, using the deck palette; no text inside, no images, no scripts,
no external links, at most ~2500 characters. Make them charming and specific to the slide's content (a real scene,
not abstract blobs). Every other "art" field is an empty string.`;

@Injectable()
export class PresentationsService {
  private readonly log = new Logger('Presentations');
  private readonly client: Anthropic | null;
  private readonly usage = new Map<string, number>();

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {
    const key = config.get<string>('ANTHROPIC_API_KEY')?.trim();
    this.client = key ? new Anthropic({ apiKey: key }) : null;
  }

  private checkLimit(teacherId: number) {
    const k = `${teacherId}:${new Date().toISOString().slice(0, 10)}`;
    const n = this.usage.get(k) ?? 0;
    if (n >= DAILY_LIMIT) {
      throw new HttpException(`Bugungi limit tugadi (${DAILY_LIMIT} ta). Ertaga yana urinib ko‘ring.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    this.usage.set(k, n + 1);
  }

  async list(teacherId: number) {
    const rows = await this.prisma.presentation.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(({ deck, teacherId: _t, ...r }) => {
      const d = deck as unknown as Deck;
      return { ...r, slides: d.slides?.length ?? 0, palette: d.theme?.palette, emoji: d.mascot?.emoji || '✨' };
    });
  }

  async get(teacherId: number, id: number) {
    const p = await this.prisma.presentation.findFirst({ where: { id, teacherId } });
    if (!p) throw new NotFoundException('Prezentatsiya topilmadi');
    return p;
  }

  async remove(teacherId: number, id: number) {
    const { count } = await this.prisma.presentation.deleteMany({ where: { id, teacherId } });
    if (!count) throw new NotFoundException('Prezentatsiya topilmadi');
    return { deleted: true };
  }

  async generate(teacherId: number, dto: GenerateDeckDto) {
    if (!this.client) throw new ServiceUnavailableException('AI ulanmagan: backend/.env faylida ANTHROPIC_API_KEY yo‘q.');
    this.checkLimit(teacherId);
    const topic = dto.topic.trim();
    await this.credits.spend(teacherId, PRESENTATION_COST, `Prezentatsiya: ${topic} (${dto.grade}-sinf)`);
    try {
      const recent = await this.prisma.presentation.findMany({
        where: { teacherId }, orderBy: { createdAt: 'desc' }, take: 8, select: { style: true },
      });
      const used = recent.map((r) => r.style);
      const frame = pick(FRAMES, used.map((s) => s.split(' | ')[0]));
      const mood = pick(MOODS, used.map((s) => s.split(' | ')[1] ?? ''));
      const deck = await this.callModel(dto, frame, mood, used);
      const p = await this.prisma.presentation.create({
        data: {
          teacherId, subject: dto.subject, grade: dto.grade, topic,
          title: deck.title || topic,
          style: `${frame.split(':')[0]} | ${mood.split(' (')[0]} | ${deck.theme.styleName}`,
          deck: deck as unknown as Prisma.InputJsonValue,
        },
      });
      return { id: p.id, credits: await this.credits.balance(teacherId) };
    } catch (e) {
      await this.credits.grant(teacherId, PRESENTATION_COST, 'refund', `Xatolik: ${topic}`);
      throw e;
    }
  }

  private async callModel(dto: GenerateDeckDto, frame: string, mood: string, used: string[]): Promise<Deck> {
    const [min, max] = SIZES[dto.size];
    const lines = [
      `Fan: ${SUBJECT_NAMES[dto.subject]}`,
      `Sinf: ${dto.grade}-sinf`,
      `Dars mavzusi: ${dto.topic.trim()}`,
      `Slaydlar soni: ${min}–${max}`,
      `Story frame: ${frame}`,
      `Colour mood: ${mood}`,
    ];
    if (used.length) lines.push(`This teacher's recent decks used these styles; make this one look and feel clearly different: ${used.join('; ')}`);
    if (dto.wishes?.trim()) lines.push(`O‘qituvchining istagi: ${dto.wishes.trim()}`);

    let msg: Anthropic.Beta.BetaMessage;
    const t0 = Date.now();
    try {
      const stream = this.client!.beta.messages.stream({
        model: 'claude-opus-5-5',
        max_tokens: 48000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(RawDeck) },
        system: SYSTEM,
        messages: [{ role: 'user', content: lines.join('\n') }],
      });
      msg = await stream.finalMessage();
    } catch (e) {
      throw aiError(e, this.log);
    }
    const u = msg.usage;
    this.log.log(`usage model=${msg.model} in=${u.input_tokens} out=${u.output_tokens} ${((Date.now() - t0) / 1000).toFixed(0)}s stop=${msg.stop_reason}`);

    if (msg.stop_reason === 'refusal') {
      throw new UnprocessableEntityException('Bu mavzu bo‘yicha prezentatsiya yaratib bo‘lmadi. Mavzuni boshqacha yozib ko‘ring.');
    }
    if (msg.stop_reason === 'max_tokens') throw new BadGatewayException('Javob juda uzun chiqdi. Qisqaroq hajmni tanlab ko‘ring.');
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    let parsed: Raw;
    try {
      parsed = RawDeck.parse(JSON.parse(text));
    } catch {
      throw new BadGatewayException('AI javobini o‘qib bo‘lmadi. Qayta urinib ko‘ring.');
    }
    const deck = clean(parsed);
    if (deck.slides.length < 4) throw new BadGatewayException('Slaydlar yetarli chiqmadi. Qayta urinib ko‘ring.');
    return deck;
  }
}

/* ---------- Tozalash: uzunliklar, quiz javobi, xavfsiz SVG ---------- */

const cut = (s: string, n: number) => s.trim().slice(0, n);
const emo = (s: string) => [...s.trim()].slice(0, 4).join('').slice(0, 16);
const HEX = /^#[0-9a-f]{6}$/i;

/** Asosiy tekshiruv frontendda (oq ro'yxat); bu yerda xavfli narsasi bor SVG umuman tashlanadi */
function safeSvg(s: string): string {
  const t = s.trim();
  if (!t.startsWith('<svg') || t.length > 12_000) return '';
  if (/<\s*(script|foreignObject|iframe|image|use|a|style)\b/i.test(t)) return '';
  if (/\son\w+\s*=|javascript:|href\s*=|url\(\s*['"]?(?!#)/i.test(t)) return '';
  return t;
}

const items = (s: RawS, n: number): Item[] =>
  s.items.slice(0, n).map((i) => ({ emoji: emo(i.emoji), title: cut(i.title, 80), text: cut(i.text, 240) }));

function toSlide(s: RawS): DeckSlide | null {
  const notes = cut(s.notes, 400);
  const title = cut(s.title, 120);
  const text = cut(s.text, 400);
  const emoji = emo(s.emoji);
  switch (s.type) {
    case 'cover':
      return { type: 'cover', title, subtitle: text, emoji, art: safeSvg(s.art), notes };
    case 'hook':
      return title && text ? { type: 'hook', question: title, emoji, reveal: text, notes } : null;
    case 'story': {
      const lines = items(s, 4).map((i) => ({ who: i.title, emoji: i.emoji, text: i.text })).filter((l) => l.text);
      return lines.length ? { type: 'story', title, lines, art: safeSvg(s.art), notes } : null;
    }
    case 'bigIdea': {
      const h = s.answer.trim();
      return text ? { type: 'bigIdea', text, highlight: h && text.includes(h) ? h : '', emoji, art: safeSvg(s.art), notes } : null;
    }
    case 'explain': {
      const points = items(s, 5).map((i) => ({ emoji: i.emoji, text: i.text || i.title })).filter((p) => p.text);
      return points.length ? { type: 'explain', title, points, art: safeSvg(s.art), notes } : null;
    }
    case 'steps': {
      const steps = items(s, 6).map((i) => ({ title: i.title, text: i.text })).filter((p) => p.title || p.text);
      return steps.length ? { type: 'steps', title, steps, notes } : null;
    }
    case 'example': {
      const steps = items(s, 6).map((i) => i.text || i.title).filter(Boolean);
      return text ? { type: 'example', title, problem: text, steps, result: cut(s.answer, 120), notes } : null;
    }
    case 'compare': {
      const [l, r] = items(s, 2);
      if (!l || !r) return null;
      const side = (i: Item): Side => ({
        title: i.title, emoji: i.emoji,
        items: i.text.split(/\n|;/).map((x) => x.trim().replace(/^[-•]\s*/, '')).filter(Boolean).slice(0, 5),
      });
      return { type: 'compare', title, left: side(l), right: side(r), notes };
    }
    case 'facts': {
      const cards = items(s, 6).filter((c) => c.text || c.title);
      return cards.length ? { type: 'facts', title, cards, notes } : null;
    }
    case 'quiz': {
      const options = [...new Set(s.options.map((o) => cut(o, 60)).filter(Boolean))].slice(0, 4);
      const answer = s.answer.trim();
      if (!title || options.length < 2 || !options.includes(answer)) return null;
      return { type: 'quiz', question: title, emoji, options, answer, explain: cut(s.text, 240), notes };
    }
    case 'activity':
      return title ? { type: 'activity', title, instruction: text, emoji, seconds: Math.min(180, Math.max(15, Math.round(s.seconds || 60))), notes } : null;
    case 'summary': {
      const points = items(s, 6).map((i) => ({ emoji: i.emoji, text: i.text || i.title })).filter((p) => p.text);
      return points.length ? { type: 'summary', title, points, notes } : null;
    }
    case 'ending':
      return { type: 'ending', title, text, emoji, notes };
  }
}

function clean(d: Raw): Deck {
  const p = d.theme.palette;
  const fallback = { bg: '#FFF8EC', surface: '#FFFFFF', primary: '#2D5BE3', secondary: '#D9691A', accent: '#1C8C4E', ink: '#1B2540' };
  const palette = { ...fallback };
  for (const k of Object.keys(fallback) as (keyof typeof fallback)[]) if (HEX.test(p[k])) palette[k] = p[k];
  const slides = d.slides.slice(0, 22).map(toSlide).filter((s): s is DeckSlide => s !== null);
  return {
    ...d,
    title: cut(d.title, 120),
    mascot: { emoji: emo(d.mascot.emoji), name: cut(d.mascot.name, 40), role: cut(d.mascot.role, 80) },
    theme: { ...d.theme, palette, styleName: cut(d.theme.styleName, 60) },
    slides,
  };
}

@Controller('presentations')
@UseGuards(JwtAuthGuard)
export class PresentationsController {
  constructor(private readonly svc: PresentationsService) {}

  @Get()
  list(@TeacherId() teacherId: number) {
    return this.svc.list(teacherId);
  }

  @Get('cost')
  cost() {
    return { cost: PRESENTATION_COST };
  }

  @Get(':id')
  get(@TeacherId() teacherId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.get(teacherId, id);
  }

  @Delete(':id')
  remove(@TeacherId() teacherId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(teacherId, id);
  }

  @Post('generate')
  generate(@TeacherId() teacherId: number, @Body() dto: GenerateDeckDto) {
    return this.svc.generate(teacherId, dto);
  }
}

@Module({
  controllers: [PresentationsController],
  providers: [PresentationsService],
})
export class PresentationsModule {}
