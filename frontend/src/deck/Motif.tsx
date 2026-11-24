import { memo, type ReactElement } from 'react';
import { rng } from './theme';
import type { Motif as MotifId } from './types';

const W = 1600, H = 900;
const COLORS = ['var(--primary)', 'var(--secondary)', 'var(--accent)'];

/** Slayd orqasidagi bezak. Har bir slayd uchun urug' boshqacha, shuning uchun naqsh takrorlanmaydi. */
function Motif({ kind, seed, dense }: { kind: MotifId; seed: number; dense?: boolean }) {
  const r = rng(seed);
  const n = dense ? 1.6 : 1;
  const c = () => COLORS[Math.floor(r() * 3)];
  // Markazni bo'sh qoldiramiz: bezaklar asosan chetlarda
  const edge = () => {
    const side = Math.floor(r() * 4);
    const t = r();
    const d = r() * 170;
    return side === 0 ? [t * W, d] : side === 1 ? [t * W, H - d] : side === 2 ? [d, t * H] : [W - d, t * H];
  };
  const els: ReactElement[] = [];

  switch (kind) {
    case 'dots':
      for (let i = 0; i < 26 * n; i++) { const [x, y] = edge(); els.push(<circle key={i} cx={x} cy={y} r={6 + r() * 22} fill={c()} opacity={0.18 + r() * 0.25} />); }
      break;
    case 'stars':
      for (let i = 0; i < 22 * n; i++) {
        const [x, y] = edge(); const s = 10 + r() * 26;
        const pts = Array.from({ length: 10 }, (_, k) => { const a = (Math.PI / 5) * k - Math.PI / 2; const rr = k % 2 ? s * 0.45 : s; return `${x + rr * Math.cos(a)},${y + rr * Math.sin(a)}`; }).join(' ');
        els.push(<polygon key={i} points={pts} fill={c()} opacity={0.3 + r() * 0.4} className="twinkle" style={{ animationDelay: `${r() * 3}s` }} />);
      }
      break;
    case 'waves':
      for (let i = 0; i < 3; i++) {
        const y0 = H - 40 - i * 55; const amp = 18 + r() * 20; const len = 220 + r() * 160; const ph = r() * len;
        let d = `M0 ${H} L0 ${y0}`;
        for (let x = 0; x <= W; x += 20) d += ` L${x} ${y0 + Math.sin(((x + ph) / len) * Math.PI * 2) * amp}`;
        d += ` L${W} ${H} Z`;
        els.push(<path key={i} d={d} fill={COLORS[i]} opacity={0.12 + i * 0.05} />);
      }
      break;
    case 'confetti':
      for (let i = 0; i < 40 * n; i++) { const [x, y] = edge(); els.push(<rect key={i} x={x} y={y} width={10 + r() * 14} height={5 + r() * 6} rx={2} fill={c()} opacity={0.55} transform={`rotate(${r() * 360} ${x} ${y})`} />); }
      break;
    case 'bubbles':
      for (let i = 0; i < 18 * n; i++) { const [x, y] = edge(); const s = 12 + r() * 40; els.push(<circle key={i} cx={x} cy={y} r={s} fill="none" stroke={c()} strokeWidth={3} opacity={0.35} className="float" style={{ animationDelay: `${r() * 4}s` }} />); }
      break;
    case 'leaves':
      for (let i = 0; i < 16 * n; i++) { const [x, y] = edge(); const s = 18 + r() * 26; els.push(<path key={i} d={`M${x} ${y} q${s} ${-s} ${s * 2} 0 q${-s} ${s} ${-s * 2} 0 Z`} fill={c()} opacity={0.3} transform={`rotate(${r() * 360} ${x} ${y})`} />); }
      break;
    case 'zigzag':
      for (let i = 0; i < 8; i++) {
        const [x, y] = edge(); let d = `M${x} ${y}`;
        for (let k = 1; k <= 6; k++) d += ` l18 ${k % 2 ? -16 : 16}`;
        els.push(<path key={i} d={d} fill="none" stroke={c()} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.4} transform={`rotate(${r() * 60 - 30} ${x} ${y})`} />);
      }
      break;
    case 'clouds':
      for (let i = 0; i < 6; i++) {
        const x = r() * W; const y = 40 + r() * 140 + (i % 2 ? H - 300 : 0); const s = 0.7 + r() * 0.8;
        els.push(<g key={i} transform={`translate(${x} ${y}) scale(${s})`} opacity={0.5} className="drift" style={{ animationDelay: `${r() * 6}s` }}>
          <ellipse cx={0} cy={0} rx={70} ry={38} fill="var(--surface)" /><ellipse cx={-50} cy={14} rx={46} ry={28} fill="var(--surface)" /><ellipse cx={52} cy={12} rx={50} ry={30} fill="var(--surface)" />
        </g>);
      }
      break;
    case 'shapes':
      for (let i = 0; i < 16 * n; i++) {
        const [x, y] = edge(); const s = 18 + r() * 30; const k = Math.floor(r() * 3); const t = `rotate(${r() * 360} ${x} ${y})`;
        els.push(k === 0 ? <circle key={i} cx={x} cy={y} r={s / 2} fill={c()} opacity={0.35} />
          : k === 1 ? <rect key={i} x={x} y={y} width={s} height={s} rx={4} fill="none" stroke={c()} strokeWidth={5} opacity={0.4} transform={t} />
            : <polygon key={i} points={`${x},${y - s / 1.5} ${x + s / 1.5},${y + s / 2} ${x - s / 1.5},${y + s / 2}`} fill={c()} opacity={0.35} transform={t} />);
      }
      break;
    case 'grid':
      for (let x = 50; x < W; x += 50) els.push(<line key={'x' + x} x1={x} y1={0} x2={x} y2={H} stroke="var(--ink)" strokeWidth={1} opacity={0.06} />);
      for (let y = 50; y < H; y += 50) els.push(<line key={'y' + y} x1={0} y1={y} x2={W} y2={y} stroke="var(--ink)" strokeWidth={1} opacity={0.06} />);
      break;
  }

  return <svg className="motif" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">{els}</svg>;
}

export default memo(Motif);
