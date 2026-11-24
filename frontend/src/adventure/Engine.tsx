import { useEffect, useRef, useState } from 'react';
import type { Mission } from './types';
import { TILE, findPath, key, walkable, type World } from './world';

type Props = {
  world: World;
  missions: Mission[];
  done: boolean[];
  taken: string[];
  avatar: string;
  name: string;
  paused: boolean;
  start: { x: number; y: number };
  onCoin: (id: string) => void;
  onTalk: (k: number) => void;
  onChest: () => void;
  onPos: (p: { x: number; y: number }) => void;
};

type Near = { kind: 'npc'; k: number } | { kind: 'gate'; k: number } | { kind: 'chest' } | null;

const SPEED = 4.3; // katak/soniya
const R = 0.28;    // qahramon "tanasi" radiusi (katakda)

/* Emoji rasmlarini bir marta chizib, keyin tez nusxalaymiz */
const spriteCache = new Map<string, HTMLCanvasElement>();
function sprite(e: string, px: number) {
  const k = e + '|' + px;
  let c = spriteCache.get(k);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(px * 1.3);
    const g = c.getContext('2d')!;
    g.font = `${px}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(e, c.width / 2, c.height / 2 + px * 0.06);
    spriteCache.set(k, c);
  }
  return c;
}

export default function Engine(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const props = useRef(p);
  props.current = p;
  const pos = useRef({ ...p.start });
  const keys = useRef(new Set<string>());
  const route = useRef<{ x: number; y: number }[] | null>(null);
  const facing = useRef(1);
  const moving = useRef(false);
  const nearRef = useRef<Near>(null);
  const [near, setNear] = useState<Near>(null);

  const interact = () => {
    const n = nearRef.current;
    if (!n || props.current.paused) return;
    if (n.kind === 'npc') props.current.onTalk(n.k);
    else if (n.kind === 'chest') props.current.onChest();
  };

  // Klaviatura
  useEffect(() => {
    const map: Record<string, string> = {
      ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
    };
    const down = (e: KeyboardEvent) => {
      if (props.current.paused) return;
      const d = map[e.code];
      if (d) { keys.current.add(d); route.current = null; e.preventDefault(); }
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); interact(); }
    };
    const up = (e: KeyboardEvent) => { const d = map[e.code]; if (d) keys.current.delete(d); };
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);

  useEffect(() => { if (p.paused) { keys.current.clear(); route.current = null; } }, [p.paused]);

  // O'yin sikli
  useEffect(() => {
    const cv = canvasRef.current!, wrap = wrapRef.current!;
    const g = cv.getContext('2d')!;
    let raf = 0, last = performance.now(), saveT = 0, zoom = 1, camX = 0, camY = 0, firstFrame = true, frameDt = 0.016;

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      cv.width = wrap.clientWidth * dpr;
      cv.height = wrap.clientHeight * dpr;
      cv.style.width = wrap.clientWidth + 'px';
      cv.style.height = wrap.clientHeight + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = props.current.world;
      zoom = Math.max(0.5, Math.min(1.35, wrap.clientHeight / (w.H * TILE)));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // Statik qatlam: yer, suv, yo'l, gullar. Bir marta chiziladi.
    const ground = document.createElement('canvas');
    {
      const w = props.current.world, T = TILE;
      ground.width = w.W * T; ground.height = w.H * T;
      const c = ground.getContext('2d')!;
      for (let x = 0; x < w.W; x++) {
        for (let y = 0; y < w.H; y++) {
          const sx = x * T, sy = y * T;
          if (w.water(x, y)) {
            c.fillStyle = (x + y) % 2 ? '#5DB7E6' : '#58B0DF';
            c.fillRect(sx, sy, T, T);
            c.strokeStyle = 'rgba(255,255,255,.45)';
            c.lineWidth = 2;
            c.beginPath();
            const off = ((x * 13 + y * 7) % 5) * T * 0.04;
            c.moveTo(sx + T * 0.2, sy + T * 0.5 + off);
            c.quadraticCurveTo(sx + T * 0.5, sy + T * 0.35 + off, sx + T * 0.8, sy + T * 0.5 + off);
            c.stroke();
            continue;
          }
          const th = w.zoneOf(x).theme;
          c.fillStyle = th.ground[(x + y) % 2];
          c.fillRect(sx, sy, T, T);
          if (w.path.has(key(x, y))) {
            // Yo'l qo'shni yo'l kataklari bilan tutashadi, chetida qirg'oq chizig'i
            const P = (dx: number, dy: number) => w.path.has(key(x + dx, y + dy));
            const e = T * 0.1;
            c.fillStyle = th.path;
            c.fillRect(sx, sy, T, T);
            c.fillStyle = th.edge;
            if (!P(0, -1)) c.fillRect(sx, sy, T, e);
            if (!P(0, 1)) c.fillRect(sx, sy + T - e, T, e);
            if (!P(-1, 0)) c.fillRect(sx, sy, e, T);
            if (!P(1, 0)) c.fillRect(sx + T - e, sy, e, T);
            c.fillStyle = 'rgba(0,0,0,.06)';
            c.beginPath(); c.arc(sx + T * ((x * 7) % 5 + 1) / 6, sy + T * ((y * 3) % 4 + 1) / 5, T * 0.05, 0, Math.PI * 2); c.fill();
          }
        }
      }
      for (const d of w.decos) {
        if (d.solid) continue;
        const px = T * 0.62;
        c.drawImage(sprite(d.e, 96), (d.x + 0.5) * T - px / 2, (d.y + 0.55) * T - px / 2, px, px);
      }
    }

    const free = (x: number, y: number) => {
      const { world, done } = props.current;
      return [[-R, -R], [R, -R], [-R, R], [R, R]].every(([dx, dy]) => walkable(world, Math.floor(x + dx), Math.floor(y + dy), done));
    };

    const step = (dt: number) => {
      const { world, done, paused } = props.current;
      let vx = 0, vy = 0;
      if (!paused) {
        const k = keys.current;
        vx = (k.has('r') ? 1 : 0) - (k.has('l') ? 1 : 0);
        vy = (k.has('d') ? 1 : 0) - (k.has('u') ? 1 : 0);
        if (!vx && !vy && route.current?.length) {
          const t = route.current[0];
          const dx = t.x - pos.current.x, dy = t.y - pos.current.y, dist = Math.hypot(dx, dy);
          if (dist < 0.08) route.current.shift();
          else { vx = dx / dist; vy = dy / dist; }
        }
      }
      const len = Math.hypot(vx, vy);
      moving.current = len > 0;
      if (len) {
        vx /= len; vy /= len;
        if (vx) facing.current = vx > 0 ? 1 : -1;
        const nx = pos.current.x + vx * SPEED * dt, ny = pos.current.y + vy * SPEED * dt;
        const okX = free(nx, pos.current.y);
        if (okX) pos.current.x = nx;
        const okY = free(pos.current.x, ny);
        if (okY) pos.current.y = ny;
        // Ikkala tomonga ham yurib bo'lmasa, yo'lni bekor qilamiz (aks holda devorga tiqilib qoladi)
        if (!okX && !okY && route.current) route.current = null;
      }

      // Tangalar
      const { taken } = props.current;
      for (const c of world.coins) {
        if (taken.includes(c.id)) continue;
        if (Math.hypot(c.x + 0.5 - pos.current.x, c.y + 0.5 - pos.current.y) < 0.65) props.current.onCoin(c.id);
      }

      // Yaqin narsa: qahramon, darvoza, xazina
      let n: Near = null;
      const P = pos.current;
      const first = done.indexOf(false);
      for (const npc of world.npcs) {
        if (Math.hypot(npc.x + 0.5 - P.x, npc.y + 0.5 - P.y) < 1.7 && (first === -1 || npc.k <= first)) n = { kind: 'npc', k: npc.k };
      }
      if (!n) for (const gt of world.gates) if (!done[gt.k] && Math.hypot(gt.x + 0.5 - P.x, gt.y + 0.5 - P.y) < 1.6) n = { kind: 'gate', k: gt.k };
      if (!n && Math.hypot(world.chest.x + 0.5 - P.x, world.chest.y + 0.5 - P.y) < 1.7) n = { kind: 'chest' };
      const a = nearRef.current;
      if (JSON.stringify(a) !== JSON.stringify(n)) { nearRef.current = n; setNear(n); }

      saveT += dt;
      if (saveT > 2) { saveT = 0; props.current.onPos({ x: P.x, y: P.y }); }
    };

    const draw = (t: number) => {
      const { world, missions, done, taken, avatar, name } = props.current;
      const vw = wrap.clientWidth, vh = wrap.clientHeight;
      const T = TILE * zoom;
      const worldW = world.W * T, worldH = world.H * T;
      const tx = pos.current.x * T - vw / 2, ty = pos.current.y * T - vh / 2;
      // Kamera yumshoq ergashadi
      const goalX = worldW <= vw ? (worldW - vw) / 2 : Math.max(0, Math.min(worldW - vw, tx));
      const goalY = worldH <= vh ? (worldH - vh) / 2 : Math.max(0, Math.min(worldH - vh, ty));
      // Birinchi kadrda darhol qahramonga, keyin vaqtga bog'liq yumshoq ergashish (kadr tezligidan qat'i nazar)
      const a = firstFrame ? 1 : Math.min(1, frameDt * 9);
      firstFrame = false;
      camX += (goalX - camX) * a;
      camY += (goalY - camY) * a;
      const ox = -camX, oy = -camY;

      g.fillStyle = '#5DB7E6';
      g.fillRect(0, 0, vw, vh);
      const x0 = Math.max(0, Math.floor(camX / T) - 1), x1 = Math.min(world.W, Math.ceil((camX + vw) / T) + 1);
      const y0 = Math.max(0, Math.floor(camY / T) - 1), y1 = Math.min(world.H, Math.ceil((camY + vh) / T) + 1);

      // Yer, suv, yo'l va mayda bezaklar — oldindan chizilgan qatlamdan (har kadrda qayta chizmaymiz)
      const sx0 = Math.max(0, camX / zoom), sy0 = Math.max(0, camY / zoom);
      const sw = Math.min(ground.width - sx0, vw / zoom), sh = Math.min(ground.height - sy0, vh / zoom);
      if (sw > 0 && sh > 0) g.drawImage(ground, sx0, sy0, sw, sh, ox + sx0 * zoom, oy + sy0 * zoom, sw * zoom, sh * zoom);

      // Yopiq darvozalar
      for (const gt of world.gates) {
        if (done[gt.k] || gt.x < x0 || gt.x > x1) continue;
        const sx = ox + gt.x * T, sy = oy + gt.y * T;
        g.fillStyle = '#8B5A2B';
        for (let i = 0; i < 3; i++) g.fillRect(sx + T * (0.12 + i * 0.3), sy + T * 0.08, T * 0.16, T * 0.84);
        g.fillStyle = '#A9743F';
        g.fillRect(sx + T * 0.05, sy + T * 0.28, T * 0.9, T * 0.13);
        g.fillRect(sx + T * 0.05, sy + T * 0.6, T * 0.9, T * 0.13);
        g.drawImage(sprite('🔒', 64), sx + T * 0.18, sy + T * 0.12, T * 0.64, T * 0.64);
      }

      // Chuqurlik bo'yicha tartiblangan narsalar
      const items: { y: number; f: () => void }[] = [];
      const bob = (ph: number) => Math.sin(t / 380 + ph) * T * 0.06;
      for (const d of world.decos) {
        if (!d.solid || d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
        const s = d.solid ? 1.12 : 0.62;
        items.push({ y: d.y + (d.solid ? 0.9 : 0.5), f: () => {
          const px = T * s;
          g.drawImage(sprite(d.e, 96), ox + (d.x + 0.5) * T - px / 2, oy + (d.y + (d.solid ? 0.45 : 0.55)) * T - px / 2, px, px);
        } });
      }
      for (const c of world.coins) {
        if (taken.includes(c.id) || c.x < x0 || c.x > x1) continue;
        items.push({ y: c.y + 0.5, f: () => {
          const px = T * 0.5;
          g.drawImage(sprite('🪙', 64), ox + (c.x + 0.5) * T - px / 2, oy + (c.y + 0.5) * T - px / 2 + bob(c.x), px, px);
        } });
      }
      const first = done.indexOf(false);
      for (const npc of world.npcs) {
        if (npc.x < x0 - 1 || npc.x > x1 + 1) continue;
        const m = missions[npc.k];
        items.push({ y: npc.y + 0.9, f: () => {
          const cx = ox + (npc.x + 0.5) * T, cy = oy + (npc.y + 0.5) * T;
          g.fillStyle = 'rgba(0,0,0,.18)';
          g.beginPath(); g.ellipse(cx, cy + T * 0.42, T * 0.38, T * 0.12, 0, 0, Math.PI * 2); g.fill();
          const px = T * 1.25;
          g.drawImage(sprite(m.npcEmoji, 96), cx - px / 2, cy - px / 2 - T * 0.05 + bob(npc.k * 2), px, px);
          const mark = done[npc.k] ? '✅' : npc.k === first ? '❗' : '';
          if (mark) {
            const mp = T * 0.55, my = cy - T * 1.05 + Math.sin(t / 250) * T * 0.08;
            g.fillStyle = '#fff';
            g.beginPath(); g.arc(cx, my + mp / 2, mp * 0.55, 0, Math.PI * 2); g.fill();
            g.drawImage(sprite(mark, 64), cx - mp / 2, my, mp, mp);
          }
          label(cx, cy + T * 0.72, m.npcName, done[npc.k] ? '#1E7F3B' : '#1E293B');
        } });
      }
      const allDone = first === -1;
      items.push({ y: world.chest.y + 0.9, f: () => {
        const cx = ox + (world.chest.x + 0.5) * T, cy = oy + (world.chest.y + 0.5) * T;
        const px = T * 1.4;
        if (allDone) {
          g.fillStyle = 'rgba(255,215,0,.35)';
          g.beginPath(); g.arc(cx, cy, T * (0.9 + Math.sin(t / 300) * 0.08), 0, Math.PI * 2); g.fill();
        }
        g.drawImage(sprite(allDone ? '🏆' : '🎁', 96), cx - px / 2, cy - px / 2, px, px);
      } });
      // Qahramon
      items.push({ y: pos.current.y + 0.3, f: () => {
        const cx = ox + pos.current.x * T, cy = oy + pos.current.y * T;
        const hop = moving.current ? Math.abs(Math.sin(t / 110)) * T * 0.12 : Math.sin(t / 500) * T * 0.02;
        g.fillStyle = 'rgba(0,0,0,.22)';
        g.beginPath(); g.ellipse(cx, cy + T * 0.32, T * 0.3, T * 0.1, 0, 0, Math.PI * 2); g.fill();
        const px = T * 1.05;
        g.save();
        g.translate(cx, cy - hop - T * 0.12);
        g.scale(facing.current, 1);
        g.drawImage(sprite(avatar, 96), -px / 2, -px / 2, px, px);
        g.restore();
        label(cx, cy - T * 0.85 - hop, name, '#1E3A8A');
      } });
      items.sort((a, b) => a.y - b.y).forEach((it) => it.f());

      function label(cx: number, cy: number, text: string, color: string) {
        if (!text) return;
        g.font = `800 ${Math.max(11, T * 0.24)}px Nunito, sans-serif`;
        const w = g.measureText(text).width + 12, h = Math.max(16, T * 0.34);
        g.fillStyle = 'rgba(255,255,255,.9)';
        g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); g.fill();
        g.fillStyle = color;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(text, cx, cy + 1);
      }
    };

    const loop = (t: number) => {
      // Sekin kompyuterda ham tezlik bir xil bo'lsin: katta vaqt oralig'ini mayda qadamlarga bo'lamiz
      let dt = Math.min(0.5, (t - last) / 1000);
      frameDt = dt;
      last = t;
      while (dt > 0) { const d = Math.min(0.04, dt); step(d); dt -= d; }
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Ekranga bosib yurish
    const click = (e: PointerEvent) => {
      if (props.current.paused) return;
      const r = cv.getBoundingClientRect();
      const T = TILE * zoom;
      const wx = Math.floor((e.clientX - r.left + camX) / T), wy = Math.floor((e.clientY - r.top + camY) / T);
      const { world, done } = props.current;
      const npc = world.npcs.find((n) => n.x === wx && n.y === wy);
      if (npc && nearRef.current?.kind === 'npc' && nearRef.current.k === npc.k) { interact(); return; }
      if (wx === world.chest.x && wy === world.chest.y && nearRef.current?.kind === 'chest') { interact(); return; }
      const found = findPath(world, pos.current, { x: wx, y: wy }, done);
      // Avval turgan katak markaziga, keyin yo'l bo'ylab (burchakka ilinib qolmaslik uchun)
      route.current = found ? [{ x: Math.floor(pos.current.x) + 0.5, y: Math.floor(pos.current.y) + 0.5 }, ...found] : null;
    };
    cv.addEventListener('pointerdown', click);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener('pointerdown', click); };
  }, []);

  const m = near && near.kind !== 'chest' ? p.missions[near.k] : null;
  const pad = (d: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); route.current = null; keys.current.add(d); },
    onPointerUp: () => keys.current.delete(d),
    onPointerLeave: () => keys.current.delete(d),
    onPointerCancel: () => keys.current.delete(d),
  });

  return (
    <div ref={wrapRef} className="adv-stage">
      <canvas ref={canvasRef} />
      {!p.paused && near && (
        <div className="adv-prompt">
          {near.kind === 'npc' && m && (
            <button className="primary" onClick={interact}>
              💬 {p.done[near.k] ? `${m.npcName} bilan gaplashish` : `${m.npcName}ga yordam berish`} <kbd>Enter</kbd>
            </button>
          )}
          {near.kind === 'gate' && m && <div className="adv-locked">🔒 Darvoza yopiq. Avval {m.npcName}ga yordam bering ({m.npcEmoji})</div>}
          {near.kind === 'chest' && (
            <button className="primary" onClick={interact}>{p.done.every(Boolean) ? '🏆 Xazinani ochish' : '🎁 Xazina'} <kbd>Enter</kbd></button>
          )}
        </div>
      )}
      <div className="adv-pad" aria-label="Yurish tugmalari">
        <button {...pad('u')} className="up" aria-label="Yuqoriga">▲</button>
        <button {...pad('l')} className="left" aria-label="Chapga">◀</button>
        <button {...pad('r')} className="right" aria-label="O‘ngga">▶</button>
        <button {...pad('d')} className="down" aria-label="Pastga">▼</button>
      </div>
    </div>
  );
}
