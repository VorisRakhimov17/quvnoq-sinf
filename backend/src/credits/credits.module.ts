import {
  BadRequestException,
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Global,
  HttpException,
  HttpStatus,
  Injectable,
  Module,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditReason } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, NotEquals } from 'class-validator';
import { JwtAuthGuard, TeacherId } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Yangi o'qituvchiga beriladigan bepul kreditlar */
export const WELCOME_CREDITS = 5;
/** Bitta o'yin yaratish narxi (kreditda) */
export const GAME_COST = 1;

@Injectable()
export class CreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** .env dagi ADMIN_EMAILS (vergul bilan) ro'yxatidagi email adminmi */
  isAdminEmail(email: string) {
    const list = (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return list.includes(email.toLowerCase());
  }

  async balance(teacherId: number) {
    const t = await this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { credits: true } });
    return t?.credits ?? 0;
  }

  /** Kreditni yechadi; yetmasa 402 qaytaradi. Atomik: bir vaqtda ikki so'rov manfiyga tushira olmaydi. */
  async spend(teacherId: number, amount: number, note: string) {
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.teacher.updateMany({
        where: { id: teacherId, credits: { gte: amount } },
        data: { credits: { decrement: amount } },
      });
      if (count === 0) {
        throw new HttpException('Kredit tugadi. Yangi o‘yin yaratish uchun kredit sotib oling.', HttpStatus.PAYMENT_REQUIRED);
      }
      await tx.creditTx.create({ data: { teacherId, amount: -amount, reason: 'generate', note } });
    });
  }

  /** Kredit qo'shadi (yoki manfiy bo'lsa ayiradi, lekin 0 dan pastga tushirmaydi) */
  async grant(teacherId: number, amount: number, reason: CreditReason, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.teacher.findUnique({ where: { id: teacherId }, select: { credits: true } });
      if (!t) throw new NotFoundException('O‘qituvchi topilmadi');
      if (t.credits + amount < 0) throw new BadRequestException(`Balans manfiy bo‘lib qoladi (hozir ${t.credits})`);
      const updated = await tx.teacher.update({
        where: { id: teacherId },
        data: { credits: { increment: amount } },
        select: { credits: true },
      });
      await tx.creditTx.create({ data: { teacherId, amount, reason, note } });
      return updated.credits;
    });
  }

  history(teacherId: number) {
    return this.prisma.creditTx.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, amount: true, reason: true, note: true, createdAt: true },
    });
  }
}

/** Faqat ADMIN_EMAILS dagi o'qituvchini o'tkazadi (JwtAuthGuard dan keyin ishlaydi) */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const id = ctx.switchToHttp().getRequest<{ teacherId?: number }>().teacherId;
    const t = id ? await this.prisma.teacher.findUnique({ where: { id }, select: { email: true } }) : null;
    if (!t || !this.credits.isAdminEmail(t.email)) throw new ForbiddenException('Bu sahifa faqat admin uchun');
    return true;
  }
}

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get()
  async mine(@TeacherId() teacherId: number) {
    return { credits: await this.credits.balance(teacherId), history: await this.credits.history(teacherId) };
  }
}

class AdminSearchQuery {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}

class GrantDto {
  @IsInt() @Min(1) teacherId: number;
  @IsInt() @Min(-1000) @Max(1000) @NotEquals(0) amount: number;
  @IsIn(['purchase', 'admin']) reason: 'purchase' | 'admin';
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
  ) {}

  @Get('teachers')
  teachers(@Query() { q }: AdminSearchQuery) {
    const s = q?.trim();
    return this.prisma.teacher.findMany({
      where: s
        ? { OR: [{ email: { contains: s, mode: 'insensitive' } }, { name: { contains: s, mode: 'insensitive' } }] }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, name: true, email: true, credits: true, createdAt: true },
    });
  }

  @Post('credits')
  async grant(@Body() dto: GrantDto) {
    const credits = await this.credits.grant(dto.teacherId, dto.amount, dto.reason, dto.note?.trim() || undefined);
    return { teacherId: dto.teacherId, credits };
  }
}

@Global()
@Module({
  controllers: [CreditsController, AdminController],
  providers: [CreditsService, AdminGuard],
  exports: [CreditsService],
})
export class CreditsModule {}
