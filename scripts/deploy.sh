#!/bin/bash
# Serverda saytni GitHub'dagi oxirgi versiyaga yangilaydi.
# Ishlatish (kompyuterdan): ssh quvnoq "bash /home/quvnoq/app/scripts/deploy.sh"
set -e
cd /home/quvnoq/app
sudo -u quvnoq git pull --ff-only
sudo -u quvnoq npm ci --no-audit --no-fund
sudo -u quvnoq bash -c "cd backend && npx prisma migrate deploy"
sudo -u quvnoq npm run build
systemctl restart quvnoq
sleep 3
systemctl is-active quvnoq
echo "Yangilandi: $(sudo -u quvnoq git log -1 --format='%h %s')"
