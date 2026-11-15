// Narxlar, karta raqami va Telegram bot backendda sozlanadi:
//   paketlar — backend/src/purchases/purchases.service.ts (PACKAGES)
//   karta, bot — backend/.env (PAYMENT_CARD, PAYMENT_CARD_OWNER, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_IDS)

export const formatSum = (n: number) => n.toLocaleString('ru-RU').replace(/\s|,/g, ' ') + ' so‘m';
