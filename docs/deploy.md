# Serverga joylash

Sayt: **https://quvnoq-sinf.uz** (www ham). Server va domen — Eskiz.uz.

## Server
- Eskiz VPS 1: 1 yadro, 1 GB RAM (+2 GB swap), 20 GB NVMe, Ubuntu 26.04. IP `189.74.100.174`.
- VPS to'lovi oylik — muddatini Eskiz kabinetida kuzating (VPS → Uzaytirish). Domen 16.11.2027 gacha.
- DNS: Eskiz → Domen → quvnoq-sinf.uz → DNS yozuvlar. `quvnoq-sinf.uz A 189.74.100.174`, `www CNAME quvnoq-sinf.uz`. Pochta yozuvlari (mail, MX, TXT) Eskiz'niki — tegilmaydi.

## Kirish
- SSH kalit: kompyuterda `~/.ssh/quvnoq_sinf`, `~/.ssh/config` da `Host quvnoq` (root). Parol bilan kirish shart emas: `ssh quvnoq`.
- Root paroli faqat egasida (Eskiz bergan).

## Tuzilishi
| Qism | Joyi |
|---|---|
| Kod | `/home/quvnoq/app` (GitHub'dan `git clone`, foydalanuvchi `quvnoq`) |
| Backend | systemd `quvnoq.service` → `node backend/dist/main.js`, port 3000 (faqat ichkarida) |
| Frontend | `frontend/dist` — Nginx to'g'ridan-to'g'ri beradi, `/api/` backendga proxy |
| Nginx | `/etc/nginx/sites-available/quvnoq` |
| Baza | PostgreSQL 18, baza `quvnoq_sinf`, foydalanuvchi `quvnoq` |
| Sirlar | `/home/quvnoq/app/backend/.env` (600). DB paroli va JWT_SECRET serverda alohida yaratilgan |
| Devor | ufw: faqat 22, 80, 443. fail2ban yoqilgan |

## Yangilash
Kompyuterda o'zgarishlarni GitHub'ga push qilgandan keyin:
```
ssh quvnoq "bash /home/quvnoq/app/scripts/deploy.sh"
```
Skript: `git pull` → `npm ci` → `prisma migrate deploy` → `npm run build` → xizmatni qayta ishga tushirish.

## Foydali buyruqlar
```
ssh quvnoq "systemctl status quvnoq"              # backend holati
ssh quvnoq "journalctl -u quvnoq -n 100 --no-pager" # backend loglari
ssh quvnoq "systemctl restart quvnoq"             # qayta ishga tushirish
ssh quvnoq "sudo -u postgres pg_dump quvnoq_sinf > /root/zaxira.sql"  # bazadan zaxira
```

## Muhim
- **Telegram bot** long polling bilan ishlaydi: bitta token bilan faqat bitta joyda ishlay oladi. Server ishlayotganda lokal `npm run dev` ham botni ishga tushirsa, ikkalasi to'qnashadi (409). Lokalda sinash uchun `backend/.env` da `TELEGRAM_BOT_TOKEN` ni vaqtincha bo'sh qoldiring.
- 1 GB RAM: `npm run build` swap'siz yetmasligi mumkin — swap o'chirilmasin.
