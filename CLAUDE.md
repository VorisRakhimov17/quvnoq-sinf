# Quvnoq Sinf

Boshlang'ich sinflar (1–4) uchun o'yinli darslar platformasi. Muallifning onasi boshlang'ich sinf o'qituvchisi; sayt sinfda proyektorda ishlatiladi.

## Stack
- `frontend/` — React 19 + TypeScript + Vite, react-router. Dev port 5173, `/api` backendga proxy qilinadi.
- `backend/` — NestJS 11 + TypeScript, Prisma 6, PostgreSQL 17. Port 3000, barcha yo'llar `/api` ostida.
- Ildizda npm workspaces: `npm run dev` ikkalasini birga ishga tushiradi.
- `prototype/quvnoq-sinf.html` — birinchi bitta faylli versiya (faqat ma'lumot uchun).

## Qoidalar
- UI matnlari o'zbek lotin yozuvida; o‘ va g‘ uchun `‘` (U+2018) belgisi ishlatiladi.
- O'yin mantig'i `frontend/src/games/` da: har bir o'yin `gen(grade)` funksiyasi savol qaytaradi.
- Sirlar faqat `backend/.env` da (gitga tushmaydi). Namuna: `backend/.env.example`.
- Loyiha qarorlari va eslatmalar shu fayl va `docs/` da saqlanadi.

## Lokal muhit
- Baza: `quvnoq_sinf`, foydalanuvchi `quvnoq` (scripts/setup-local-db.ps1 bilan yaratilgan, paroli faqat backend/.env da).
- `postgres` superuser paroli noma'lum — unga tegilmaydi.
- npm 11 install skriptlarini bloklaydi: yangi paket skript talab qilsa, `npm install-scripts approve <pkg>` (ildiz package.json `allowScripts`).
- Backend tsconfig'da `incremental` ishlatmang: nest `deleteOutDir` bilan birga dist bo'sh qoladi.

## Rejalar
- Hozir: lokal kompyuterda ishlaydi (D:\Quvnoq sinf).
- Keyin: GitHub repo, so'ng foydalanuvchi bergan serverga joylash (docs/deploy.md yoziladi).
