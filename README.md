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
| DELETE | `/api/questions/:id` | 🔒 savolni o‘chirish |
