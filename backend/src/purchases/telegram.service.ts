import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PurchasesService, describe } from './purchases.service';

/* Telegram Bot API turlari (faqat bizga keraklilari) */
type TgUser = { id: number; first_name?: string; username?: string };
type TgChat = { id: number };
type TgMessage = {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
  caption?: string;
  photo?: { file_id: string; width: number }[];
  document?: { file_id: string; mime_type?: string };
};
type TgCallback = { id: string; from: TgUser; data?: string; message?: TgMessage };
type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallback };

/**
 * Kredit to'lovlari uchun Telegram bot (long polling, ochiq server manzili shart emas).
 * .env: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_IDS (vergul bilan, raqamli Telegram ID).
 * Diqqat: bitta token bilan faqat bitta joyda (lokal YOKI server) ishga tushiring.
 */
@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly log = new Logger('TelegramBot');
  private readonly token: string | null;
  private readonly admins: string[];
  private username: string | null = null;
  private running = false;
  private abort = new AbortController();

  constructor(
    config: ConfigService,
    private readonly purchases: PurchasesService,
  ) {
    this.token = config.get<string>('TELEGRAM_BOT_TOKEN')?.trim() || null;
    this.admins = (config.get<string>('TELEGRAM_ADMIN_IDS') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  }

  /** Bot nomi (t.me havolasi uchun); bot sozlanmagan bo'lsa null */
  get botUsername() {
    return this.username;
  }

  async onApplicationBootstrap() {
    if (!this.token) {
      this.log.warn('TELEGRAM_BOT_TOKEN yo‘q — bot o‘chiq');
      return;
    }
    try {
      const me = await this.call<TgUser>('getMe');
      this.username = me.username ?? null;
      this.log.log(`Bot ishga tushdi: @${this.username}; adminlar: ${this.admins.length || 'yo‘q (TELEGRAM_ADMIN_IDS)'}`);
    } catch (e) {
      this.log.error(`Bot tokeni ishlamadi: ${(e as Error).message}`);
      return;
    }
    this.running = true;
    void this.loop().catch((e) => this.log.error(`Polling to‘xtadi: ${(e as Error).message}`));
  }

  onApplicationShutdown() {
    this.running = false;
    this.abort.abort();
  }

  private async call<T>(method: string, body: Record<string, unknown> = {}, timeoutMs = 15_000): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(timeoutMs)]),
    });
    const data = (await res.json()) as { ok: boolean; result: T; description?: string };
    if (!data.ok) throw new Error(`${method}: ${data.description ?? res.status}`);
    return data.result;
  }

  private async loop() {
    let offset = 0;
    while (this.running) {
      try {
        const updates = await this.call<TgUpdate[]>(
          'getUpdates',
          { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] },
          35_000,
        );
        for (const u of updates) {
          offset = u.update_id + 1;
          const kind = u.message ? (u.message.text ? `matn "${u.message.text.slice(0, 30)}"` : 'fayl/rasm') : 'tugma';
          this.log.log(`Keldi: ${kind} (chat ${u.message?.chat.id ?? u.callback_query?.from.id})`);
          try {
            if (u.message) await this.onMessage(u.message);
            if (u.callback_query) await this.onCallback(u.callback_query);
          } catch (e) {
            this.log.error(`Update ${u.update_id}: ${(e as Error).message}`);
          }
        }
      } catch (e) {
        if (!this.running) return;
        this.log.warn(`getUpdates: ${(e as Error).message}; 5 soniyadan keyin qayta`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  private send(chatId: string | number, text: string, extra: Record<string, unknown> = {}) {
    return this.call('sendMessage', { chat_id: chatId, text, ...extra });
  }

  private isAdmin(id: number) {
    return this.admins.includes(String(id));
  }

  private async onMessage(m: TgMessage) {
    const chatId = String(m.chat.id);
    const text = m.text?.trim() ?? '';

    if (text.startsWith('/start')) {
      const code = text.split(/\s+/)[1];
      if (!code) {
        await this.send(chatId,
          'Assalomu alaykum! Bu Quvnoq Sinf to‘lov boti.\n\n' +
          'Kredit sotib olish uchun saytda paketni tanlang, karta raqamiga to‘lang va “Chekni yuborish” tugmasini bosing.\n\n' +
          `Sizning Telegram ID: ${m.from?.id ?? m.chat.id}`);
        return;
      }
      const p = await this.purchases.byCode(code);
      if (!p) { await this.send(chatId, 'Buyurtma topilmadi. Saytdan qaytadan “Chekni yuborish”ni bosing.'); return; }
      if (p.status === 'approved') { await this.send(chatId, '✅ Bu buyurtma allaqachon tasdiqlangan.'); return; }
      if (p.status === 'rejected') { await this.send(chatId, 'Bu buyurtma rad etilgan. Saytda yangi buyurtma yarating.'); return; }
      if (p.status === 'submitted') { await this.send(chatId, '⏳ Chekingiz qabul qilingan, tekshirilmoqda.'); return; }
      await this.purchases.linkChat(p.id, chatId);
      await this.send(chatId,
        `🧾 Buyurtma #${p.code}\n${describe(p)}\nO‘qituvchi: ${p.teacher.name}\n\n` +
        'To‘lov chekining rasmini (skrinshot) shu yerga yuboring.');
      return;
    }

    const fileId = m.photo?.length
      ? m.photo[m.photo.length - 1].file_id
      : m.document && (m.document.mime_type?.startsWith('image/') || m.document.mime_type === 'application/pdf')
        ? m.document.file_id
        : null;

    const waiting = await this.purchases.awaitingInChat(chatId);
    if (!fileId) {
      await this.send(chatId, waiting
        ? 'Iltimos, chekni rasm (skrinshot) yoki PDF ko‘rinishida yuboring.'
        : 'Chek yuborish uchun saytdagi “Chekni yuborish” tugmasini bosing.');
      return;
    }
    if (!waiting) {
      await this.send(chatId, 'Ochiq buyurtma topilmadi. Avval saytdagi “Chekni yuborish” tugmasini bosing.');
      return;
    }

    const p = await this.purchases.submitReceipt(waiting.id, chatId, fileId);
    await this.send(chatId, '✅ Chek qabul qilindi. Tekshirilgach, kredit hisobingizga tushadi va shu yerga xabar keladi.');

    if (this.admins.length === 0) {
      this.log.warn(`Chek keldi (#${p.code}), lekin TELEGRAM_ADMIN_IDS bo‘sh — admin sahifasidan tasdiqlang`);
      return;
    }
    const caption =
      `🧾 Yangi to‘lov #${p.code}\n${describe(p)}\n` +
      `O‘qituvchi: ${p.teacher.name}\nEmail: ${p.teacher.email}\nBalans hozir: ${p.teacher.credits}`;
    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Tasdiqlash', callback_data: `ok:${p.id}` },
        { text: '❌ Rad etish', callback_data: `no:${p.id}` },
      ]],
    };
    for (const admin of this.admins) {
      try {
        // Chekni adminga o'sha fayl bilan yuboramiz (rasm bo'lsa photo, aks holda document)
        const method = m.photo?.length ? 'sendPhoto' : 'sendDocument';
        await this.call(method, {
          chat_id: admin,
          [m.photo?.length ? 'photo' : 'document']: fileId,
          caption,
          reply_markup: keyboard,
        });
      } catch (e) {
        this.log.error(`Adminga (${admin}) yuborilmadi: ${(e as Error).message}. Admin botga /start bosganmi?`);
      }
    }
  }

  private async onCallback(q: TgCallback) {
    const [action, idStr] = (q.data ?? '').split(':');
    const id = Number(idStr);
    if (!this.isAdmin(q.from.id) || !id || (action !== 'ok' && action !== 'no')) {
      await this.call('answerCallbackQuery', { callback_query_id: q.id, text: 'Ruxsat yo‘q' });
      return;
    }
    const r = await this.purchases.decide(id, action === 'ok');
    const status = r.purchase.status === 'approved' ? '✅ Tasdiqlandi' : '❌ Rad etildi';
    await this.call('answerCallbackQuery', {
      callback_query_id: q.id,
      text: r.changed ? status : `Avval hal qilingan: ${status}`,
    });
    if (q.message) {
      const old = q.message.caption ?? q.message.text ?? '';
      await this.call('editMessageCaption', {
        chat_id: q.message.chat.id,
        message_id: q.message.message_id,
        caption: `${old}\n\n${status}${r.changed && action === 'ok' ? ` · yangi balans: ${r.balance}` : ''}`,
      }).catch(() => undefined);
    }
    if (r.changed) await this.notifyDecision(r.purchase.tgChatId, r.purchase.status === 'approved', r.purchase, r.balance);
  }

  /** O'qituvchiga natijani Telegram orqali bildiradi (admin sahifasidan tasdiqlanganda ham) */
  async notifyDecision(chatId: string | null, approved: boolean, p: { credits: number; price: number; code: string }, balance: number) {
    if (!this.token || !chatId) return;
    const text = approved
      ? `🎉 To‘lov tasdiqlandi! Hisobingizga ${p.credits} kredit qo‘shildi.\nBalans: 💎 ${balance}\n\nRahmat!`
      : `To‘lov #${p.code} tasdiqlanmadi. Savol bo‘lsa, shu yerga yozing yoki saytda yangi buyurtma yarating.`;
    await this.send(chatId, text).catch((e) => this.log.error(`Xabar yuborilmadi: ${(e as Error).message}`));
  }
}
