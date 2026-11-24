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
import { IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';
import { z } from 'zod';
import { SUBJECT_NAMES, aiError } from '../ai/ai.module';
import { JwtAuthGuard, TeacherId } from '../auth/jwt.guard';
import { CreditsService, GAME_COST } from '../credits/credits.module';
import { PrismaService } from '../prisma/prisma.service';

const DAILY_LIMIT = 30;

export class GeneratePackDto {
  @IsIn(['math', 'lang', 'nature']) subject: Subject;
  @IsInt() @Min(1) @Max(4) grade: number;
  @IsString() @Length(2, 200, { message: 'Mavzu 2–200 belgi bo‘lsin' }) topic: string;
}

/* AI javobi. Frontend turlari: frontend/src/pack/types.ts */
const RawPack = z.object({
  title: z.string(),
  emoji: z.string(),
  quiz: z.array(z.object({ question: z.string(), emoji: z.string(), options: z.array(z.string()), answer: z.string(), explain: z.string() })),
  truefalse: z.array(z.object({ statement: z.string(), emoji: z.string(), isTrue: z.boolean(), explain: z.string() })),
  pairs: z.object({ title: z.string(), items: z.array(z.object({ left: z.string(), right: z.string() })) }),
  sort: z.object({
    title: z.string(),
    groups: z.array(z.object({ name: z.string(), emoji: z.string() })),
    items: z.array(z.object({ text: z.string(), group: z.number().int() })),
  }),
  order: z.array(z.object({ title: z.string(), steps: z.array(z.string()) })),
});
type Raw = z.infer<typeof RawPack>;

const SYSTEM = `You create a set of classroom mini-games for primary school children (grades 1–4) in Uzbekistan
on the teacher's lesson topic. The teacher plays them on a projector with the whole class, sometimes as two teams.

Language: Uzbek, Latin script, current official orthography. Write o‘ and g‘ with ‘ (U+2018) and the tutuq belgisi
with ’ (U+2019), e.g. "ma’no". Use simple words a child of the given grade knows; short texts that read well from
across the room.

Make five games, all strictly on the topic and right for the grade:
- quiz: 8 questions. Each: question (≤ 110 characters), emoji (one emoji illustrating it), options = exactly 4 short
  options (≤ 30 characters, all different, plausible, one correct), answer copied exactly from options, explain = one
  friendly sentence. Vary question types and the position of the correct answer.
- truefalse: 8 statements (≤ 100 characters), about half true and half false; false ones must be clearly and
  unambiguously false (a common misconception is ideal). emoji, isTrue, explain = one sentence with the correct fact.
- pairs: a "find the pair" game. title tells the children what to match (e.g. "Misolni javobi bilan ulang").
  6 items {left, right}; each side ≤ 24 characters; every right side is different and matches exactly one left side.
  Emoji are welcome when they help (e.g. left "🐄", right "sigir").
- sort: a "put into two groups" game. title = instruction; groups = exactly 2 {name ≤ 20 characters, emoji};
  10 items {text ≤ 28 characters, group = 0 or 1}, about half in each group, each clearly belonging to one group.
- order: 2 tasks "put in the right order". Each: title = instruction, steps = 4–6 short items (≤ 40 characters)
  listed in the CORRECT order (the game shuffles them). The order must be unambiguous (stages of a process, numbers
  from smallest to largest, steps of a calculation, events of a story…).
- title: a fun short name for the game set; emoji: one emoji for the set.

Facts must be correct and match the national primary curriculum. For maths, double-check every calculation.`;

@Injectable()
export class PacksService {
  private readonly log = new Logger('GamePacks');
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
    const rows = await this.prisma.gamePack.findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map(({ data, teacherId: _t, ...r }) => ({ ...r, emoji: (data as { emoji?: string }).emoji || '🎮' }));
  }

  async get(teacherId: number, id: number) {
    const p = await this.prisma.gamePack.findFirst({ where: { id, teacherId } });
    if (!p) throw new NotFoundException('O‘yinlar to‘plami topilmadi');
    return p;
  }

  async remove(teacherId: number, id: number) {
    const { count } = await this.prisma.gamePack.deleteMany({ where: { id, teacherId } });
    if (!count) throw new NotFoundException('O‘yinlar to‘plami topilmadi');
    return { deleted: true };
  }

  async generate(teacherId: number, dto: GeneratePackDto) {
    if (!this.client) throw new ServiceUnavailableException('AI ulanmagan: backend/.env faylida ANTHROPIC_API_KEY yo‘q.');
    const k = `${teacherId}:${new Date().toISOString().slice(0, 10)}`;
    const n = this.usage.get(k) ?? 0;
    if (n >= DAILY_LIMIT) throw new HttpException(`Bugungi limit tugadi (${DAILY_LIMIT} ta).`, HttpStatus.TOO_MANY_REQUESTS);
    this.usage.set(k, n + 1);

    const topic = dto.topic.trim();
    await this.credits.spend(teacherId, GAME_COST, `O‘yinlar: ${topic} (${dto.grade}-sinf)`);
    try {
      const data = await this.callModel(dto);
      const p = await this.prisma.gamePack.create({
        data: {
          teacherId, subject: dto.subject, grade: dto.grade, topic, title: data.title || topic,
          data: data as unknown as Prisma.InputJsonValue,
        },
      });
      return { id: p.id, credits: await this.credits.balance(teacherId) };
    } catch (e) {
      await this.credits.grant(teacherId, GAME_COST, 'refund', `Xatolik: ${topic}`);
      throw e;
    }
  }

  private async callModel(dto: GeneratePackDto) {
    const user = [`Fan: ${SUBJECT_NAMES[dto.subject]}`, `Sinf: ${dto.grade}-sinf`, `Dars mavzusi: ${dto.topic.trim()}`].join('\n');
    let msg: Anthropic.Beta.BetaMessage;
    const t0 = Date.now();
    try {
      msg = await this.client!.beta.messages.stream({
        model: 'claude-opus-5-5',
        max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(RawPack) },
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }).finalMessage();
    } catch (e) {
      throw aiError(e, this.log);
    }
    const u = msg.usage;
    this.log.log(`usage model=${msg.model} in=${u.input_tokens} out=${u.output_tokens} ${((Date.now() - t0) / 1000).toFixed(0)}s stop=${msg.stop_reason}`);
    if (msg.stop_reason === 'refusal') {
      throw new UnprocessableEntityException('Bu mavzu bo‘yicha o‘yin yaratib bo‘lmadi. Mavzuni boshqacha yozib ko‘ring.');
    }
    const text = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    let raw: Raw;
    try {
      raw = RawPack.parse(JSON.parse(text));
    } catch {
      throw new BadGatewayException('AI javobini o‘qib bo‘lmadi. Qayta urinib ko‘ring.');
    }
    const pack = clean(raw);
    if (pack.quiz.length < 3) throw new BadGatewayException('Yaroqli savollar yetarli chiqmadi. Qayta urinib ko‘ring.');
    return pack;
  }
}

/* ---------- Tozalash: yaroqsiz elementlar tashlanadi, o'yin bo'sh bo'lsa o'sha o'yin ko'rsatilmaydi ---------- */

const cut = (s: string, n: number) => s.trim().slice(0, n);
const emo = (s: string) => [...s.trim()].slice(0, 4).join('').slice(0, 16);

function clean(r: Raw) {
  const quiz = r.quiz.slice(0, 12).flatMap((q) => {
    const options = [...new Set(q.options.map((o) => cut(o, 60)).filter(Boolean))].slice(0, 4);
    const answer = q.answer.trim();
    if (!q.question.trim() || options.length < 2 || !options.includes(answer)) return [];
    return [{ question: cut(q.question, 200), emoji: emo(q.emoji), options, answer, explain: cut(q.explain, 240) }];
  });
  const truefalse = r.truefalse.slice(0, 12).filter((t) => t.statement.trim()).map((t) => ({
    statement: cut(t.statement, 200), emoji: emo(t.emoji), isTrue: !!t.isTrue, explain: cut(t.explain, 240),
  }));
  // Juftliklar: o'ng tomoni takrorlanmasin (aks holda bir nechta to'g'ri javob bo'lib qoladi)
  const seen = new Set<string>();
  const pairItems = r.pairs.items.slice(0, 8).flatMap((p) => {
    const left = cut(p.left, 40), right = cut(p.right, 40);
    if (!left || !right || seen.has(right.toLowerCase()) || seen.has('L' + left.toLowerCase())) return [];
    seen.add(right.toLowerCase()); seen.add('L' + left.toLowerCase());
    return [{ left, right }];
  });
  const groups = r.sort.groups.slice(0, 2).map((g) => ({ name: cut(g.name, 40), emoji: emo(g.emoji) }));
  const sortItems = groups.length === 2
    ? r.sort.items.slice(0, 14).filter((i) => i.text.trim() && (i.group === 0 || i.group === 1)).map((i) => ({ text: cut(i.text, 60), group: i.group }))
    : [];
  const order = r.order.slice(0, 3).map((o) => ({
    title: cut(o.title, 120), steps: o.steps.map((s) => cut(s, 80)).filter(Boolean).slice(0, 7),
  })).filter((o) => o.steps.length >= 3 && new Set(o.steps).size === o.steps.length);

  return {
    title: cut(r.title, 100),
    emoji: emo(r.emoji) || '🎮',
    quiz,
    truefalse,
    pairs: { title: cut(r.pairs.title, 120), items: pairItems.length >= 3 ? pairItems : [] },
    sort: { title: cut(r.sort.title, 120), groups, items: sortItems.length >= 4 ? sortItems : [] },
    order,
  };
}

@Controller('packs')
@UseGuards(JwtAuthGuard)
export class PacksController {
  constructor(private readonly svc: PacksService) {}

  @Get()
  list(@TeacherId() teacherId: number) {
    return this.svc.list(teacherId);
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
  generate(@TeacherId() teacherId: number, @Body() dto: GeneratePackDto) {
    return this.svc.generate(teacherId, dto);
  }
}

@Module({
  controllers: [PacksController],
  providers: [PacksService],
})
export class PacksModule {}
