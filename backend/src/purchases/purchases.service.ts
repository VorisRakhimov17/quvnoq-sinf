import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CreditsService } from '../credits/credits.module';
import { PrismaService } from '../prisma/prisma.service';

/** Kredit paketlari (narx so'mda). Narxni shu yerda o'zgartiring. */
export const PACKAGES = [
  { credits: 10, price: 15_000 },
  { credits: 30, price: 39_000, best: true },
  { credits: 100, price: 119_000 },
];

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/\s|,/g, ' ') + ' so‘m';
export const describe = (p: { credits: number; price: number }) => `${p.credits} ta o‘yin — ${fmt(p.price)}`;

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly config: ConfigService,
  ) {}

  /** Karta ma'lumotlari .env dan: PAYMENT_CARD, PAYMENT_CARD_OWNER */
  payment() {
    return {
      card: this.config.get<string>('PAYMENT_CARD')?.trim() || null,
      owner: this.config.get<string>('PAYMENT_CARD_OWNER')?.trim() || null,
    };
  }

  async create(teacherId: number, credits: number) {
    const pkg = PACKAGES.find((p) => p.credits === credits);
    if (!pkg) throw new BadRequestException('Bunday paket yo‘q');
    // Bitta o'qituvchida bir vaqtda ko'p ochiq buyurtma bo'lmasin
    const open = await this.prisma.purchase.count({ where: { teacherId, status: { in: ['pending', 'submitted'] } } });
    if (open >= 3) throw new ConflictException('Sizda tekshirilmagan buyurtmalar bor. Avval ular tasdiqlanishini kuting.');
    const code = randomBytes(5).toString('hex').toUpperCase(); // 10 belgili kod
    return this.prisma.purchase.create({ data: { code, teacherId, credits: pkg.credits, price: pkg.price } });
  }

  mine(teacherId: number) {
    return this.prisma.purchase.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, code: true, credits: true, price: true, status: true, createdAt: true, decidedAt: true },
    });
  }

  byCode(code: string) {
    return this.prisma.purchase.findUnique({ where: { code: code.toUpperCase() }, include: { teacher: true } });
  }

  /** Chek kelganini belgilaydi */
  submitReceipt(id: number, chatId: string, fileId: string) {
    return this.prisma.purchase.update({
      where: { id },
      data: { status: 'submitted', tgChatId: chatId, receiptId: fileId },
      include: { teacher: true },
    });
  }

  linkChat(id: number, chatId: string) {
    return this.prisma.purchase.update({ where: { id }, data: { tgChatId: chatId } });
  }

  /** Telegram chatda chek kutayotgan oxirgi buyurtma */
  awaitingInChat(chatId: string) {
    return this.prisma.purchase.findFirst({
      where: { tgChatId: chatId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  pending() {
    return this.prisma.purchase.findMany({
      where: { status: { in: ['pending', 'submitted'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
  }

  /**
   * Tasdiqlash yoki rad etish. Faqat bir marta ishlaydi: ikki admin bir vaqtda bossa ham
   * kredit ikki marta qo'shilmaydi.
   */
  async decide(id: number, approve: boolean) {
    const { count } = await this.prisma.purchase.updateMany({
      where: { id, status: { in: ['pending', 'submitted'] } },
      data: { status: approve ? 'approved' : 'rejected', decidedAt: new Date() },
    });
    const p = await this.prisma.purchase.findUnique({ where: { id }, include: { teacher: true } });
    if (!p) throw new NotFoundException('Buyurtma topilmadi');
    if (count === 0) return { purchase: p, changed: false, balance: p.teacher.credits };
    let balance = p.teacher.credits;
    if (approve) {
      balance = await this.credits.grant(p.teacherId, p.credits, 'purchase', `${describe(p)} (#${p.code})`);
    }
    return { purchase: p, changed: true, balance };
  }
}
