import { Body, Controller, Get, Module, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsInt } from 'class-validator';
import { JwtAuthGuard, TeacherId } from '../auth/jwt.guard';
import { AdminGuard } from '../credits/credits.module';
import { PACKAGES, PurchasesService } from './purchases.service';
import { TelegramService } from './telegram.service';

class CreatePurchaseDto {
  @IsInt() @IsIn(PACKAGES.map((p) => p.credits)) credits: number;
}

class DecideDto {
  @IsIn(['approve', 'reject']) action: 'approve' | 'reject';
}

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(
    private readonly purchases: PurchasesService,
    private readonly bot: TelegramService,
  ) {}

  /** Paketlar, karta va bot: sotib olish oynasi uchun */
  @Get('config')
  config() {
    return { packages: PACKAGES, ...this.purchases.payment(), bot: this.bot.botUsername };
  }

  @Get()
  mine(@TeacherId() teacherId: number) {
    return this.purchases.mine(teacherId);
  }

  @Post()
  async create(@TeacherId() teacherId: number, @Body() dto: CreatePurchaseDto) {
    const p = await this.purchases.create(teacherId, dto.credits);
    const bot = this.bot.botUsername;
    return {
      id: p.id, code: p.code, credits: p.credits, price: p.price, status: p.status, createdAt: p.createdAt,
      botLink: bot ? `https://t.me/${bot}?start=${p.code}` : null,
    };
  }
}

@Controller('admin/purchases')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPurchasesController {
  constructor(
    private readonly purchases: PurchasesService,
    private readonly bot: TelegramService,
  ) {}

  @Get()
  pending() {
    return this.purchases.pending();
  }

  @Post(':id')
  async decide(@Param('id', ParseIntPipe) id: number, @Body() dto: DecideDto) {
    const r = await this.purchases.decide(id, dto.action === 'approve');
    if (r.changed) await this.bot.notifyDecision(r.purchase.tgChatId, dto.action === 'approve', r.purchase, r.balance);
    return { id, status: r.purchase.status, changed: r.changed, balance: r.balance };
  }
}

@Module({
  controllers: [PurchasesController, AdminPurchasesController],
  providers: [PurchasesService, TelegramService],
})
export class PurchasesModule {}
