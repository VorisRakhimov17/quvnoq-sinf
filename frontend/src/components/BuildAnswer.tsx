import { useState } from 'react';
import type { BuildQ } from '../games/types';

type Props = { q: BuildQ; locked: boolean; onDone: (ok: boolean) => void };

/** "So'z tuz" o'yini: harflarni bosib kataklarga joylash */
export default function BuildAnswer({ q, locked, onDone }: Props) {
  const [filled, setFilled] = useState<(number | null)[]>(() => q.answer.map(() => null));
  const [result, setResult] = useState<boolean | null>(null);

  function place(tile: number) {
    if (locked || result !== null) return;
    const slot = filled.indexOf(null);
    if (slot < 0) return;
    const next = filled.slice();
    next[slot] = tile;
    setFilled(next);
    if (!next.includes(null)) {
      const ok = next.map((i) => q.tiles[i!]).join('') === q.answer.join('');
      setResult(ok);
      onDone(ok);
    }
  }

  function unplace(slot: number) {
    if (locked || result !== null) return;
    const next = filled.slice();
    next[slot] = null;
    setFilled(next);
  }

  const slotClass = (t: number | null) =>
    'slot' + (t !== null ? ' full' : '') + (result === true ? ' ok' : result === false ? ' bad' : '');

  return (
    <div className="build">
      <div className="slots">
        {filled.map((t, i) => (
          <button key={i} className={slotClass(t)} onClick={() => unplace(i)} disabled={result !== null} aria-label={`${i + 1}-katak`}>
            {t !== null ? q.tiles[t] : ''}
          </button>
        ))}
      </div>
      <div className="tiles">
        {q.tiles.map((u, i) => (
          <button key={i} className="tile" onClick={() => place(i)} disabled={filled.includes(i) || result !== null}>
            {u}
          </button>
        ))}
      </div>
      {result === null && (
        <button className="ghost" onClick={() => setFilled(q.answer.map(() => null))}>Tozalash</button>
      )}
    </div>
  );
}
