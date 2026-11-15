import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Module,
  Post,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subject } from '@prisma/client';
import { IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';
import { z } from 'zod';
import { JwtAuthGuard, TeacherId } from '../auth/jwt.guard';
import { CreditsService, GAME_COST } from '../credits/credits.module';

const SUBJECTS = ['math', 'lang', 'nature'] as const;
const SUBJECT_NAMES: Record<Subject, string> = {
  math: 'Matematika',
  lang: 'Ona tili va o‘qish',
  nature: 'Tabiatshunoslik (Atrofimizdagi olam)',
};

/** Bir o'qituvchi bir kunda nechta marta yaratishi mumkin (xarajatni cheklash uchun) */
const DAILY_LIMIT = 30;

export class GenerateDto {
  @IsIn(SUBJECTS) subject: Subject;
  @IsInt() @Min(1) @Max(4) grade: number;
  @IsString() @Length(2, 200, { message: 'Mavzu 2–200 belgi bo‘lsin' }) topic: string;
  @IsInt() @Min(5) @Max(15) count: number;
}

const QuizSchema = z.object({
  questions: z.array(
    z.object({
      prompt: z.string(),
      emoji: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
      explain: z.string(),
    }),
  ),
});

export type GeneratedQuestion = {
  prompt: string;
  emoji: string;
  options: string[];
  answer: string;
  explain: string;
};

const SYSTEM = `You write classroom quiz games for primary school children (grades 1–4) in Uzbekistan.
The teacher shows the questions on a projector and the whole class answers together.

Language: Uzbek, Latin script, following the current official orthography. Write o‘ and g‘ with the
character ‘ (U+2018), and the tutuq belgisi with ’ (U+2019), e.g. "ma’no". Use simple words a child of the
given grade knows; short sentences.

Each question:
- prompt: one clear question, at most ~120 characters, matching the topic and the grade level.
- emoji: exactly one emoji that illustrates the question (no text).
- options: exactly 4 short answer options (1–4 words each, at most 40 characters), all different,
  plausible for a child, only one correct.
- answer: the correct option, copied exactly from options.
- explain: one friendly sentence (at most ~150 characters) that explains why the answer is correct.

Content rules: facts must be correct and appropriate for the national primary curriculum. Vary the
question types (fill in, choose, count, compare, true fact) and the position of the correct answer.
For math, double-check every calculation. Stay strictly on the teacher's topic; if the topic is broad,
cover different sides of it.`;

@Injectable()
export class AiService {
  private readonly log = new Logger('AiService');
  private readonly client: Anthropic | null;
  private readonly usage = new Map<string, number>();

  constructor(
    config: ConfigService,
    private readonly credits: CreditsService,
  ) {
    const key = config.get<string>('ANTHROPIC_API_KEY')?.trim();
    this.client = key ? new Anthropic({ apiKey: key }) : null;
  }

  get enabled() {
    return this.client !== null;
  }

  private checkLimit(teacherId: number) {
    const k = `${teacherId}:${new Date().toISOString().slice(0, 10)}`;
    const n = this.usage.get(k) ?? 0;
    if (n >= DAILY_LIMIT) {
      throw new HttpException(`Bugungi limit tugadi (${DAILY_LIMIT} ta). Ertaga yana urinib ko‘ring.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    this.usage.set(k, n + 1);
  }

  /** Kredit yechib o'yin yaratadi; AI tomonda xato bo'lsa kreditni qaytaradi */
  async generate(teacherId: number, dto: GenerateDto): Promise<{ questions: GeneratedQuestion[]; credits: number }> {
    if (!this.client) {
      throw new ServiceUnavailableException('AI ulanmagan: backend/.env faylida ANTHROPIC_API_KEY yo‘q.');
    }
    this.checkLimit(teacherId);
    const topic = dto.topic.trim();
    await this.credits.spend(teacherId, GAME_COST, `${topic} (${dto.grade}-sinf)`);
    try {
      const questions = await this.callModel(dto);
      return { questions, credits: await this.credits.balance(teacherId) };
    } catch (e) {
      await this.credits.grant(teacherId, GAME_COST, 'refund', `Xatolik: ${topic}`);
      throw e;
    }
  }

  private async callModel(dto: GenerateDto): Promise<GeneratedQuestion[]> {
    if (!this.client) throw new ServiceUnavailableException('AI ulanmagan');

    const user = `Fan: ${SUBJECT_NAMES[dto.subject]}
Sinf: ${dto.grade}-sinf
Bugungi dars mavzusi: ${dto.topic.trim()}
Savollar soni: ${dto.count}`;

    let res;
    try {
      res = await this.client.beta.messages.parse({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(QuizSchema) },
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      });
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        throw new ServiceUnavailableException('API kalit noto‘g‘ri yoki o‘chirilgan. backend/.env ni tekshiring.');
      }
      if (e instanceof Anthropic.PermissionDeniedError) {
        throw new ServiceUnavailableException('API kalitda ruxsat yo‘q (balansni tekshiring).');
      }
      if (e instanceof Anthropic.RateLimitError) {
        throw new HttpException('AI hozir band. Bir daqiqadan keyin qayta urinib ko‘ring.', HttpStatus.TOO_MANY_REQUESTS);
      }
      if (e instanceof Anthropic.BadRequestError) {
        this.log.error(`Bad request: ${e.message}`);
        throw new BadGatewayException('AI so‘rovni qabul qilmadi. Balans tugagan bo‘lishi mumkin.');
      }
      if (e instanceof Anthropic.APIError) {
        this.log.error(`API error ${e.status}: ${e.message}`);
        throw new BadGatewayException('AI xizmatida xatolik. Birozdan keyin qayta urinib ko‘ring.');
      }
      throw e;
    }

    const u = res.usage;
    this.log.log(`usage model=${res.model} in=${u.input_tokens} out=${u.output_tokens} count=${dto.count}`);

    if (res.stop_reason === 'refusal') {
      throw new UnprocessableEntityException('Bu mavzu bo‘yicha savol yaratib bo‘lmadi. Mavzuni boshqacha yozib ko‘ring.');
    }
    if (!res.parsed_output) {
      throw new BadGatewayException('AI javobini o‘qib bo‘lmadi. Qayta urinib ko‘ring.');
    }

    const clean = res.parsed_output.questions.map(sanitize).filter((q): q is GeneratedQuestion => q !== null);
    if (clean.length === 0) throw new BadGatewayException('Yaroqli savol chiqmadi. Qayta urinib ko‘ring.');
    return clean.slice(0, dto.count);
  }
}

/** AI javobini bazadagi cheklovlarga moslaydi; yaroqsiz savolni tashlab yuboradi */
function sanitize(q: GeneratedQuestion): GeneratedQuestion | null {
  const prompt = q.prompt.trim().slice(0, 300);
  const options = [...new Set(q.options.map((o) => o.trim()).filter((o) => o && o.length <= 60))].slice(0, 4);
  const answer = q.answer.trim();
  if (!prompt || options.length < 2 || !options.includes(answer)) return null;
  return {
    prompt,
    emoji: [...q.emoji.trim()].slice(0, 4).join('').slice(0, 16),
    options,
    answer,
    explain: q.explain.trim().slice(0, 300),
  };
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('status')
  status() {
    return { enabled: this.ai.enabled };
  }

  @Post('generate')
  generate(@TeacherId() teacherId: number, @Body() dto: GenerateDto) {
    return this.ai.generate(teacherId, dto);
  }
}

@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
