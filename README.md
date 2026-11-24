# Quvnoq Sinf

Boshlang‘ich sinflar (1–4) uchun o‘yinli darslar platformasi: matematika, ona tili va tabiatshunoslik.
O‘qituvchi o‘z akkauntiga kirib, natijalarni ko‘radi va o‘z savollarini qo‘shadi.

## Texnologiyalar

| Qism | Texnologiya |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | NestJS 11, TypeScript, Prisma ORM |
| Baza | PostgreSQL 17 |

## Papkalar

```
frontend/src/games/   o‘yinlar mantig‘i (yangi so‘z, hayvon, savol qo‘shish shu yerda)
frontend/src/pages/   sahifalar: bosh sahifa, o‘yin, kirish, kabinet
frontend/src/styles.css  ranglar va dizayn
backend/src/          API: auth, results, questions
backend/prisma/schema.prisma  baza jadvallari
prototype/            birinchi bitta faylli versiya
```

## Birinchi marta ishga tushirish

1. `backend/.env.example` faylini `backend/.env` deb nusxalang. Keyin bazani yarating:
   - `postgres` paroli ma'lum bo'lsa: `.env` dagi `PAROL` ni almashtiring va `quvnoq_sinf` bazasini yarating.
   - Parol noma'lum bo'lsa (Windows): administrator PowerShell'da
     `powershell -ExecutionPolicy Bypass -File scripts\setup-local-db.ps1` ni ishga tushiring.
     U `quvnoq` foydalanuvchisi va `quvnoq_sinf` bazasini yaratib, parolni `.env` ga yozadi.
2. Paketlarni o‘rnating va bazani yarating:
   ```bash
   npm install
   npm run db:migrate
   ```
3. Ishga tushiring:
   ```bash
   npm run dev
   ```
4. Brauzerda oching: http://localhost:5173

## Mavzu bo‘yicha o‘yinlar to‘plami

Kabinetdagi “🎮 Mavzu bo‘yicha o‘yinlar” bo‘limi mavzuni yozganda 5 xil o‘yin tayyorlaydi (1 kredit, ~30 soniya):
🧠 viktorina, ⚖️ to‘g‘ri yoki noto‘g‘ri, 🔗 juftini top, 🧺 guruhlarga ajrat, 🪜 tartibga sol.
- O‘ynash: `/toplam/:id`. Viktorina, to‘g‘ri/noto‘g‘ri va guruhlash ikki jamoa bo‘lib ham o‘ynaladi.
  Klavishlar: 1–4 / ← → — javob, Enter — keyingisi. Natijalar “Natijalar” bo‘limiga `pack-<tur>` nomi bilan saqlanadi.
- O‘lchov: 2 100 kirish / 2 200 chiqish token ≈ $0.05. Kod: `backend/src/packs/`, `frontend/src/pack/`.
- Prezentatsiyaning oxirgi slaydida va ro‘yxatida “🎮 O‘yin” tugmasi shu mavzu bilan formani to‘ldirib ochadi.
- Eski usul (savollarni tahrirlab “Mening savollarim”ga saqlash) shu bo‘lim pastida qoldi.
  Kalit: `backend/.env` dagi `ANTHROPIC_API_KEY`. Har bir o‘qituvchiga kuniga 30 ta yaratish limiti bor.

## Dars prezentatsiyasi

Kabinetdagi “🎬 Prezentatsiya” bo‘limi mavzu bo‘yicha to‘liq dars slaydlarini yaratadi: muqova, topishmoq, hikoya,
tushuntirish, qadamlar, ishlangan misollar, taqqoslash, “Bilasizmi?”, savollar (A–D), taymerli faollik, xulosa.
- Har safar boshqa syujet (kosmik sayohat, detektiv, Ipak yo‘li…) va rang kayfiyati tanlanadi; o‘qituvchining oxirgi
  8 ta prezentatsiyasi uslubi takrorlanmaydi. AI palitra, shrift, naqsh, harakat va 3–5 ta SVG rasm chizadi.
- Narxi 3 kredit (`PRESENTATION_COST`, `backend/src/presentations/presentations.module.ts`). O‘lchov: 14 slayd ≈
  3 000 kirish / 8 300 chiqish token ≈ $0.18, ~80 soniya.
- Ko‘rsatish: `/prezentatsiya/:id`. Klavishlar: → / probel — keyingi (avval misol qadamlari va javob ochiladi),
  ← — oldingi, 1–4 — savolga javob, F — to‘liq ekran, N — o‘qituvchi izohi, G — barcha slaydlar, Esc — chiqish.
- Kod: `frontend/src/deck/` (SlideView — slayd turlari, Motif — fon naqshi, Art — SVG oq ro‘yxat bilan tozalanadi).

## Kreditlar

- 1 kredit = 1 AI o‘yin. Yangi o‘qituvchiga 5 ta bepul kredit (`WELCOME_CREDITS`, `backend/src/credits/credits.module.ts`).
- AI xato qilsa, kredit avtomatik qaytariladi. Har bir harakat `CreditTx` jadvalida saqlanadi.
- Paketlar va narxlar: `backend/src/purchases/purchases.service.ts` (`PACKAGES`).
- Sotib olish: o‘qituvchi paketni tanlaydi → karta raqamiga to‘laydi → “Chekni yuborish” Telegram botni ochadi →
  chek adminga ✅/❌ tugmalari bilan keladi → ✅ bosilganda kredit avtomatik tushadi va bot o‘qituvchiga xabar beradi.
  Zaxira yo‘l: `/admin` sahifasidagi “Kutilayotgan to‘lovlar”.
- `backend/.env`: `PAYMENT_CARD`, `PAYMENT_CARD_OWNER`, `TELEGRAM_BOT_TOKEN` (@BotFather), `TELEGRAM_ADMIN_IDS`
  (botga /start yozing — u Telegram ID’ingizni aytadi), `ADMIN_EMAILS` (sayt admin sahifasi).
- Bot long polling bilan ishlaydi: bitta token bilan faqat bitta joyda (lokal yoki server) ishga tushiring.

## Foydali buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `npm run dev` | Backend (3000) va frontendni (5173) birga ishga tushiradi |
| `npm run build` | Ikkalasini production uchun yig‘adi |
| `npm run db:migrate` | `schema.prisma` o‘zgarganda bazani yangilaydi |
| `npm run db:studio` | Bazani brauzerda ko‘rish va tahrirlash |

## API

Barcha yo‘llar `/api` ostida. Belgilanganlari uchun `Authorization: Bearer <token>` kerak.

| Usul | Yo‘l | |
|---|---|---|
| GET | `/api/health` | server va baza holati |
| POST | `/api/auth/register` | ro‘yxatdan o‘tish |
| POST | `/api/auth/login` | kirish |
| GET | `/api/auth/me` | 🔒 joriy o‘qituvchi |
| GET/POST | `/api/results` | 🔒 o‘yin natijalari |
| GET/POST | `/api/questions` | 🔒 o‘qituvchi savollari |
| POST | `/api/questions/bulk` | 🔒 bir nechta savolni birga saqlash |
| DELETE | `/api/questions/:id` | 🔒 savolni o‘chirish |
| GET | `/api/ai/status` | 🔒 AI ulanganmi |
| GET | `/api/credits` | 🔒 kredit balansi va tarixi |
| GET | `/api/purchases/config` | 🔒 paketlar, karta, bot |
| GET/POST | `/api/purchases` | 🔒 mening buyurtmalarim / yangi buyurtma |
| GET | `/api/admin/purchases` | 🔒👑 kutilayotgan to‘lovlar |
| POST | `/api/admin/purchases/:id` | 🔒👑 tasdiqlash yoki rad etish |
| GET | `/api/admin/teachers` | 🔒👑 o‘qituvchilar ro‘yxati |
| POST | `/api/admin/credits` | 🔒👑 kredit qo‘shish/ayirish |
| POST | `/api/ai/generate` | 🔒 mavzu bo‘yicha savollar yaratish (1 kredit, saqlamaydi) |
| POST | `/api/presentations/generate` | 🔒 prezentatsiya yaratish va saqlash (3 kredit) |
| GET | `/api/presentations`, `/api/presentations/:id` | 🔒 mening prezentatsiyalarim / bittasi |
| DELETE | `/api/presentations/:id` | 🔒 o‘chirish |
| POST | `/api/packs/generate` | 🔒 5 xil o‘yinli to‘plam yaratish va saqlash (1 kredit) |
| GET/DELETE | `/api/packs`, `/api/packs/:id` | 🔒 mening to‘plamlarim / bittasi / o‘chirish |
