# Quvnoq Sinf

Boshlang'ich sinflar (1–4) uchun o'yinli darslar platformasi. Muallifning onasi boshlang'ich sinf o'qituvchisi; sayt sinfda proyektorda ishlatiladi.

## Stack
- `frontend/` — React 19 + TypeScript + Vite, react-router. Dev port 5173, `/api` backendga proxy qilinadi.
- `backend/` — NestJS 11 + TypeScript, Prisma 6, PostgreSQL 17. Port 3000, barcha yo'llar `/api` ostida.
- Ildizda npm workspaces: `npm run dev` ikkalasini birga ishga tushiradi.
- `prototype/quvnoq-sinf.html` — birinchi bitta faylli versiya (faqat ma'lumot uchun).

## Qoidalar
- Foydalanuvchiga hamma narsa faqat o'zbek tilida yoziladi (xabarlar, xulosa oynasi, tugmalar, savollar) — inglizcha emas.
- UI matnlari o'zbek lotin yozuvida; o‘ va g‘ uchun `‘` (U+2018) belgisi ishlatiladi.
- O'yin mantig'i `frontend/src/games/` da: har bir o'yin `gen(grade)` funksiyasi savol qaytaradi.
- Sirlar faqat `backend/.env` da (gitga tushmaydi). Namuna: `backend/.env.example`.
- Loyiha qarorlari va eslatmalar shu fayl va `docs/` da saqlanadi.

## AI (mavzu bo'yicha o'yin)
- `backend/src/ai/ai.module.ts`: `@anthropic-ai/sdk`, `beta.messages.parse` + zod sxema, `fallbacks: 'default'`. Kalit `ANTHROPIC_API_KEY` (.env). Savollar `topic` maydoni bilan saqlanadi; o'yin: `/oyin/mening-<fan>?mavzu=<mavzu>`.

## O'yinlar to'plami
- `backend/src/packs/packs.module.ts` (GamePack, data JSON) ↔ `frontend/src/pack/types.ts`. 5 o'yin: quiz, truefalse, pairs, sort, order. Narx `GAME_COST` (1). `clean()` yaroqsiz elementni tashlaydi; bo'sh o'yin menyuda ko'rinmaydi.
- CSS: `deck.css` va `pack.css` dagi har bir selektor `.present` / `.pk` bilan boshlanadi (`python scripts/scope-css.py <fayl> <klass>`), chunki Vite hamma CSS'ni global yuklaydi.

## Prezentatsiyalar
- `backend/src/presentations/presentations.module.ts`: AI tekis (flat) slayd sxemasini qaytaradi (union sxema "compiled grammar is too large" xatosini berdi), `toSlide()` aniq turlarga o'giradi. Frontend turlari: `frontend/src/deck/types.ts` — ikkalasi mos bo'lishi shart.
- Takrorlanmaslik: `FRAMES` (syujet) va `MOODS` (rang) tasodifiy, oxirgi 8 ta `style` dan qochiladi. Slayd ko'rinishi varianti `hash(title+index)` dan.
- Narx 3 kredit (14 slayd ≈ $0.18, 2026-11-24 o'lchov). Streaming + `finalMessage()`, `max_tokens` 48000.
- SVG: backend xavfli belgisi borini tashlaydi, frontend `Art.tsx` oq ro'yxat bilan tozalaydi.

## Kreditlar (pullik model)
- 1 kredit = 1 AI o'yin; yangi o'qituvchiga 5 bepul. Narx o'lchovi (2026-11-15, claude-opus-5-5): 10 savol ≈ 900 in / 2200 out token ≈ $0.047, 15 savol ≈ $0.07.
- Paketlar: 10 — 15 000, 30 — 39 000, 100 — 119 000 so'm (`backend/src/purchases/purchases.service.ts`).
- To'lov: karta + chek Telegram botga (`purchases/telegram.service.ts`, long polling, fetch). Admin ✅ bosadi → `PurchasesService.decide` (bir martalik, atomik) → kredit. Zaxira: `/admin`. Keyin Payme/Click integratsiyasi mumkin.
- Admin: `ADMIN_EMAILS` (.env). `CreditsService.spend` atomik; AI xatosida `refund`.

## Lokal muhit
- Baza: `quvnoq_sinf`, foydalanuvchi `quvnoq` (scripts/setup-local-db.ps1 bilan yaratilgan, paroli faqat backend/.env da).
- `postgres` superuser paroli noma'lum — unga tegilmaydi.
- npm 11 install skriptlarini bloklaydi: yangi paket skript talab qilsa, `npm install-scripts approve <pkg>` (ildiz package.json `allowScripts`).
- Backend tsconfig'da `incremental` ishlatmang: nest `deleteOutDir` bilan birga dist bo'sh qoladi.

## Rejalar
- Hozir: lokal kompyuterda ishlaydi (D:\Quvnoq sinf).
- Keyin: GitHub repo, so'ng foydalanuvchi bergan serverga joylash (docs/deploy.md yoziladi).
