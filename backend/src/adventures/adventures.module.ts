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
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { aiError } from '../ai/ai.module';
import { JwtAuthGuard, TeacherId } from '../auth/jwt.guard';
import { CreditsService } from '../credits/credits.module';
import { PrismaService } from '../prisma/prisma.service';

/** Bitta sarguzasht narxi (kreditda): missiyalar ko'p, javob uzun */
export const ADVENTURE_COST = 3;
const DAILY_LIMIT = 10;

export class GenerateAdventureDto {
  @IsInt() @Min(1) @Max(4) grade: number;
  @IsArray() @ArrayMinSize(2, { message: 'Kamida 2 ta mavzu kiriting' }) @ArrayMaxSize(8, { message: 'Ko‘pi bilan 8 ta mavzu' })
  @IsString({ each: true }) @Length(2, 120, { each: true, message: 'Har bir mavzu 2–120 belgi bo‘lsin' })
  topics: string[];
  @IsOptional() @IsString() @MaxLength(300) wishes?: string;
}

export class ProgressDto {
  @IsString() @Matches(/^[a-z0-9]{8,40}$/) playerId: string;
  @IsString() @Length(1, 30) name: string;
  @IsString() @Length(1, 16) avatar: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(500) stars: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(5000) coins: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(20) missions: number;
  @IsBoolean() finished: boolean;
}

/* ---------- AI javobi (frontend turlari: frontend/src/adventure/types.ts) ---------- */

const ZONES = ['meadow', 'forest', 'desert', 'snow', 'beach', 'village', 'mountain', 'candy'] as const;

const RawAdventure = z.object({
  title: z.string(),
  intro: z.string(),
  goal: z.string(),
  finale: z.string(),
  missions: z.array(z.object({
    topic: z.string(),
    title: z.string(),
    zone: z.enum(ZONES),
    npcName: z.string(),
    npcEmoji: z.string(),
    story: z.string(),
    success: z.string(),
    rewardName: z.string(),
    rewardEmoji: z.string(),
    tasks: z.array(z.object({
      kind: z.enum(['choice', 'truefalse', 'order', 'match']),
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      explain: z.string(),
    })),
  })),
});
type Raw = z.infer<typeof RawAdventure>;

const SYSTEM = `You design an adventure game for primary school children (grades 1–4) in Uzbekistan. A hero walks across
a colourful world; each area has a character who gives a mission. Each mission practises ONE of the teacher's lesson
topics for the week or month, so playing the game revises what the class studied.

The game must be kind and safe for small children: no violence, no weapons, no scary villains. Missions are about
helping, fixing, finding, building, rescuing a lost animal, opening a magic gate, and similar.

Language: Uzbek, Latin script, current official orthography. Write o‘ and g‘ with ‘ (U+2018) and the tutuq belgisi
with ’ (U+2019). Simple words a child of the grade knows; short sentences.

Write:
- title: a fun name for the adventure (≤ 40 characters).
- intro: 2–3 sentences that start the story and tell the hero why they travel.
- goal: one short line with the final goal (e.g. "Oltin kalitni topib, qishloq bayramini qutqar!").
- finale: 2 sentences of celebration when every mission is done.
- missions: exactly one mission per topic, in the given order. For each:
  - topic: the topic text as given; title: short mission name (≤ 32 characters);
  - zone: the area it happens in (meadow, forest, desert, snow, beach, village, mountain, candy) — use a different
    zone for neighbouring missions so the journey feels varied;
  - npcName and npcEmoji (one emoji: an animal, a person or a friendly creature) of the character asking for help;
  - story: 2 sentences, the character explains the problem and how the topic will help;
  - success: one sentence the character says when the mission is complete;
  - rewardName and rewardEmoji: an item the hero receives (a key, a map piece, a magic stone…);
  - tasks: exactly 5 tasks on the mission's topic, getting a little harder, mixing kinds:
    2 × "choice": question (≤ 110 characters), options = exactly 4 short options (all different, ideally ≤ 24
      characters each), answer copied exactly from options;
    1 × "match": question is the instruction (e.g. "Har bir misolni javobi bilan juftlang"), options = exactly 4
      pairs written as "left|right" (one "|" in each; every left and every right is different and short, ≤ 22
      characters; each left has exactly one correct right), answer is an empty string;
    1 × "truefalse": question is a statement, options = ["To‘g‘ri", "Noto‘g‘ri"], answer is one of them;
    1 × "order": question is the instruction, options = 3–5 short items listed in the CORRECT order (the game shuffles
      them), answer is an empty string. The order must be unambiguous.
    explain: one friendly sentence with the correct fact.
Facts must be correct and match the national primary curriculum. Double-check every calculation.`;

const CODE_ABC = 'abcdefghjkmnpqrstuvwxyz23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_ABC[randomInt(CODE_ABC.length)]).join('');

@Injectable()
export class AdventuresService {
  private readonly log = new Logger('Adventures');
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

  async list(teacherId: number) {
    const rows = await this.prisma.adventure.findMany({
      where: { teacherId }, orderBy: { createdAt: 'desc' }, take: 100,
      include: { _count: { select: { runs: true } } },
    });
    return rows.map(({ data, teacherId: _t, _count, ...r }) => ({
      ...r, players: _count.runs, missions: ((data as { missions?: unknown[] }).missions ?? []).length,
    }));
  }

  async leaderboard(teacherId: number, id: number) {
    const a = await this.prisma.adventure.findFirst({ where: { id, teacherId }, select: { id: true } });
    if (!a) throw new NotFoundException('Sarguzasht topilmadi');
    return this.prisma.adventureRun.findMany({
      where: { adventureId: id },
      orderBy: [{ stars: 'desc' }, { missions: 'desc' }, { coins: 'desc' }, { updatedAt: 'asc' }],
      take: 200,
      select: { name: true, avatar: true, stars: true, coins: true, missions: true, finished: true, updatedAt: true },
    });
  }

  async remove(teacherId: number, id: number) {
    const { count } = await this.prisma.adventure.deleteMany({ where: { id, teacherId } });
    if (!count) throw new NotFoundException('Sarguzasht topilmadi');
    return { deleted: true };
  }

  /** O'quvchilar uchun: kirishsiz, kod orqali */
  async byCode(code: string) {
    const a = await this.prisma.adventure.findUnique({
      where: { code: code.toLowerCase() },
      select: { code: true, title: true, grade: true, data: true },
    });
    if (!a) throw new NotFoundException('Bunday sarguzasht topilmadi. Havolani tekshiring.');
    return a;
  }

  async saveProgress(code: string, dto: ProgressDto) {
    const a = await this.prisma.adventure.findUnique({ where: { code: code.toLowerCase() }, select: { id: true, data: true } });
    if (!a) throw new NotFoundException('Sarguzasht topilmadi');
    const total = ((a.data as { missions?: unknown[] }).missions ?? []).length;
    const missions = Math.min(dto.missions, total);
    const stars = Math.min(dto.stars, total * 5);
    const data = { name: dto.name.trim().slice(0, 30), avatar: [...dto.avatar].slice(0, 2).join(''), stars, coins: dto.coins, missions, finished: dto.finished && missions >= total };
    await this.prisma.adventureRun.upsert({
      where: { adventureId_playerId: { adventureId: a.id, playerId: dto.playerId } },
      create: { adventureId: a.id, playerId: dto.playerId, ...data },
      update: data,
    });
    return { ok: true };
  }

  async generate(teacherId: number, dto: GenerateAdventureDto) {
    if (!this.client) throw new ServiceUnavailableException('AI ulanmagan: backend/.env faylida ANTHROPIC_API_KEY yo‘q.');
    const k = `${teacherId}:${new Date().toISOString().slice(0, 10)}`;
    const n = this.usage.get(k) ?? 0;
    if (n >= DAILY_LIMIT) throw new HttpException(`Bugungi limit tugadi (${DAILY_LIMIT} ta).`, HttpStatus.TOO_MANY_REQUESTS);
    this.usage.set(k, n + 1);

    const topics = dto.topics.map((t) => t.trim()).filter(Boolean);
    await this.credits.spend(teacherId, ADVENTURE_COST, `Sarguzasht: ${topics.length} ta mavzu (${dto.grade}-sinf)`);
    try {
      const data = await this.callModel(dto.grade, topics, dto.wishes);
      let code = newCode();
      for (let i = 0; i < 5 && (await this.prisma.adventure.findUnique({ where: { code } })); i++) code = newCode();
      const a = await this.prisma.adventure.create({
        data: { teacherId, code, title: data.title, grade: dto.grade, topics, data: data as unknown as Prisma.InputJsonValue },
      });
      return { id: a.id, code: a.code, credits: await this.credits.balance(teacherId) };
    } catch (e) {
      await this.credits.grant(teacherId, ADVENTURE_COST, 'refund', 'Xatolik: sarguzasht');
      throw e;
    }
  }

  private async callModel(grade: number, topics: string[], wishes?: string) {
    const user = [
      `Sinf: ${grade}-sinf`,
      'Mavzular (har biriga bitta missiya, shu tartibda):',
      ...topics.map((t, i) => `${i + 1}. ${t}`),
      ...(wishes?.trim() ? [`O‘qituvchining istagi: ${wishes.trim()}`] : []),
    ].join('\n');
    let msg: Anthropic.Beta.BetaMessage;
    const t0 = Date.now();
    try {
      msg = await this.client!.beta.messages.stream({
        model: 'claude-opus-5-5',
        max_tokens: 48000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(RawAdventure) },
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }).finalMessage();
    } catch (e) {
      throw aiError(e, this.log);
    }
    const u = msg.usage;
    this.log.log(`usage model=${msg.model} in=${u.input_tokens} out=${u.output_tokens} ${((Date.now() - t0) / 1000).toFixed(0)}s stop=${msg.stop_reason}`);
    if (msg.stop_reason === 'refusal') throw new UnprocessableEntityException('Bu mavzular bo‘yicha sarguzasht yaratib bo‘lmadi. Mavzularni boshqacha yozib ko‘ring.');
    if (msg.stop_reason === 'max_tokens') throw new BadGatewayException('Javob juda uzun chiqdi. Mavzularni kamaytirib ko‘ring.');
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    let raw: Raw;
    try {
      raw = RawAdventure.parse(JSON.parse(text));
    } catch {
      throw new BadGatewayException('AI javobini o‘qib bo‘lmadi. Qayta urinib ko‘ring.');
    }
    const data = clean(raw);
    if (data.missions.length < 2) throw new BadGatewayException('Missiyalar yetarli chiqmadi. Qayta urinib ko‘ring.');
    return data;
  }
}

/* ---------- Tozalash ---------- */

const cut = (s: string, n: number) => s.trim().slice(0, n);
const emo = (s: string, d: string) => [...s.trim()].slice(0, 3).join('').slice(0, 12) || d;
const TF = ['To‘g‘ri', 'Noto‘g‘ri'];
type Task = { kind: 'choice' | 'truefalse' | 'order' | 'match'; question: string; options: string[]; answer: string; explain: string };

function clean(r: Raw) {
  const missions = r.missions.slice(0, 8).map((m) => {
    const tasks = m.tasks.slice(0, 7).flatMap((t): Task[] => {
      const question = cut(t.question, 220);
      const explain = cut(t.explain, 240);
      if (!question) return [];
      if (t.kind === 'truefalse') {
        const a = t.answer.trim().toLowerCase().startsWith('n') ? TF[1] : TF[0];
        return [{ kind: 'truefalse', question, options: TF, answer: a, explain }];
      }
      if (t.kind === 'match') {
        // "chap|o'ng" juftlari: ikkala tomoni ham bo'sh emas va takrorlanmas bo'lishi kerak
        const pairs = t.options.map((o) => o.split('|')).filter((x) => x.length === 2)
          .map(([a, b]) => [cut(a, 40), cut(b, 40)]).filter(([a, b]) => a && b);
        const ok = pairs.filter(([a, b], k) => pairs.findIndex(([a2, b2]) => a2 === a || b2 === b) === k).slice(0, 5);
        return ok.length >= 3 ? [{ kind: 'match', question, options: ok.map(([a, b]) => `${a}|${b}`), answer: '', explain }] : [];
      }
      const options = [...new Set(t.options.map((o) => cut(o, 70)).filter(Boolean))];
      if (t.kind === 'order') {
        return options.length >= 3 ? [{ kind: 'order', question, options: options.slice(0, 6), answer: '', explain }] : [];
      }
      const four = options.slice(0, 4);
      const answer = t.answer.trim();
      return four.length >= 2 && four.includes(answer) ? [{ kind: 'choice', question, options: four, answer, explain }] : [];
    });
    return {
      topic: cut(m.topic, 120), title: cut(m.title, 60), zone: m.zone,
      npcName: cut(m.npcName, 40), npcEmoji: emo(m.npcEmoji, '🦉'),
      story: cut(m.story, 400), success: cut(m.success, 240),
      rewardName: cut(m.rewardName, 40), rewardEmoji: emo(m.rewardEmoji, '🗝️'),
      tasks,
    };
  }).filter((m) => m.tasks.length >= 3);
  return { title: cut(r.title, 80), intro: cut(r.intro, 500), goal: cut(r.goal, 160), finale: cut(r.finale, 400), missions };
}

/* ---------- Kontrollerlar ---------- */

@Controller('adventures')
@UseGuards(JwtAuthGuard)
export class AdventuresController {
  constructor(private readonly svc: AdventuresService) {}

  @Get()
  list(@TeacherId() teacherId: number) {
    return this.svc.list(teacherId);
  }

  @Get('cost')
  cost() {
    return { cost: ADVENTURE_COST };
  }

  @Get(':id/leaderboard')
  leaderboard(@TeacherId() teacherId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.leaderboard(teacherId, id);
  }

  @Delete(':id')
  remove(@TeacherId() teacherId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(teacherId, id);
  }

  @Post('generate')
  generate(@TeacherId() teacherId: number, @Body() dto: GenerateAdventureDto) {
    return this.svc.generate(teacherId, dto);
  }
}

/** O'quvchilar uchun ochiq yo'llar (kirish shart emas) */
@Controller('play')
export class PlayController {
  constructor(private readonly svc: AdventuresService) {}

  @Get(':code')
  get(@Param('code') code: string) {
    return this.svc.byCode(code);
  }

  @Post(':code/progress')
  progress(@Param('code') code: string, @Body() dto: ProgressDto) {
    return this.svc.saveProgress(code, dto);
  }
}

@Module({
  controllers: [AdventuresController, PlayController],
  providers: [AdventuresService],
})
export class AdventuresModule {}
