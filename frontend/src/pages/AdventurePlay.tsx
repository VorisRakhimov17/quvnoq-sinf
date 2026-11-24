import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Engine from '../adventure/Engine';
import MissionDialog from '../adventure/MissionDialog';
import type { PublicAdventure, Save } from '../adventure/types';
import { buildWorld } from '../adventure/world';
import '../adventure/adventure.css';
import { api } from '../api';
import { beep } from '../sound';

const AVATARS = ['🧒', '👧', '👦', '🦊', '🐼', '🐯', '🐸', '🤖'];
const store = {
  get(code: string): Save | null {
    try { return JSON.parse(localStorage.getItem('adv:' + code) || 'null'); } catch { return null; }
  },
  set(code: string, s: Save) {
    try { localStorage.setItem('adv:' + code, JSON.stringify(s)); } catch { /* brauzer saqlamasa ham o'yin davom etadi */ }
  },
};
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('');

/** O'quvchilar uchun ochiq sahifa: /sarguzasht/:code (kirish shart emas) */
export default function AdventurePlay() {
  const { code = '' } = useParams();
  const [adv, setAdv] = useState<PublicAdventure | null>(null);
  const [error, setError] = useState('');
  const [save, setSave] = useState<Save | null>(null);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [finale, setFinale] = useState(false);
  const [sound, setSound] = useState(true);
  const [toast, setToast] = useState('');
  const toastT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    api.playAdventure(code).then((a) => { setAdv(a); setSave(store.get(code)); }, (e: Error) => setError(e.message));
  }, [code]);

  const missions = adv?.data.missions ?? [];
  const world = useMemo(() => (adv ? buildWorld(adv.code, adv.data.missions) : null), [adv]);

  const update = useCallback((f: (s: Save) => Save) => {
    setSave((s) => {
      if (!s) return s;
      const n = f(s);
      store.set(code, n);
      return n;
    });
  }, [code]);

  const report = (s: Save) => {
    const done = s.done.filter(Boolean).length;
    api.playProgress(code, {
      playerId: s.playerId, name: s.name, avatar: s.avatar,
      stars: s.stars.reduce((a, b) => a + b, 0), coins: s.coins, missions: done, finished: done === missions.length,
    }).catch(() => { /* internet bo'lmasa keyingi missiyada qayta yuboriladi */ });
  };

  const flash = (t: string) => {
    setToast(t);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 2200);
  };

  if (error) return <div className="adv-page"><div className="adv-start"><h1>😕</h1><p>{error}</p></div></div>;
  if (!adv || !world) return <div className="adv-page"><div className="adv-start"><p>Yuklanmoqda…</p></div></div>;

  if (!playing || !save) {
    return <StartScreen adv={adv} save={save} onStart={(s) => { store.set(code, s); setSave(s); setPlaying(true); report(s); }} />;
  }

  const n = missions.length;
  const doneCount = save.done.filter(Boolean).length;
  const totalStars = save.stars.reduce((a, b) => a + b, 0);
  const current = save.done.indexOf(false);

  return (
    <div className="adv-page playing">
      <header className="adv-hud">
        <div className="adv-title">
          <b>{adv.data.title}</b>
          <small>{current === -1 ? '🏆 Hamma missiyalar bajarildi! Xazinaga boring →' : `Hozir: ${missions[current].npcEmoji} ${missions[current].npcName} — ${missions[current].title}`}</small>
        </div>
        <div className="adv-stats">
          <span title="Yulduzlar">⭐ {totalStars}</span>
          <span title="Tangalar">🪙 {save.coins}</span>
          <span title="Missiyalar">🗺️ {doneCount}/{n}</span>
          <span className="adv-bag" title="Mukofotlar">{missions.map((m, k) => <i key={k} className={save.done[k] ? 'got' : ''}>{save.done[k] ? m.rewardEmoji : '◻️'}</i>)}</span>
          <button onClick={() => setSound(!sound)} aria-label="Ovoz">{sound ? '🔊' : '🔇'}</button>
          <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})} aria-label="To‘liq ekran">⛶</button>
        </div>
      </header>

      <Engine
        world={world} missions={missions} done={save.done} taken={save.taken} avatar={save.avatar} name={save.name}
        paused={open !== null || finale} start={save.pos ?? { x: world.spawn.x + 0.5, y: world.spawn.y + 0.5 }}
        onCoin={(id) => {
          if (save.taken.includes(id)) return;
          if (sound) beep(true);
          update((s) => (s.taken.includes(id) ? s : { ...s, coins: s.coins + 1, taken: [...s.taken, id] }));
        }}
        onTalk={(k) => setOpen(k)}
        onChest={() => {
          if (save.done.every(Boolean)) { setFinale(true); if (sound) beep(true); }
          else flash(`🎁 Xazina yopiq. Avval ${n - doneCount} ta missiyani bajaring.`);
        }}
        onPos={(p) => update((s) => ({ ...s, pos: p }))}
      />

      {doneCount === 0 && open === null && <div className="adv-hint">👉 Yo‘l bo‘ylab o‘ngga yuring: <b>strelkalar</b> yoki ekranga bosing</div>}
      {toast && <div className="adv-toast">{toast}</div>}

      {open !== null && (
        <MissionDialog
          mission={missions[open]} index={open} best={save.stars[open]} doneBefore={save.done[open]} sound={sound}
          onClose={() => setOpen(null)}
          onFinish={(stars, passed) => {
            let next: Save | null = null;
            update((s) => {
              const st = [...s.stars]; st[open] = Math.max(st[open], stars);
              const dn = [...s.done]; if (passed) dn[open] = true;
              next = { ...s, stars: st, done: dn };
              return next;
            });
            setTimeout(() => next && report(next), 0);
          }}
        />
      )}

      {finale && (
        <div className="adv-modal">
          <div className="adv-card adv-finale">
            <div className="adv-trophy">🏆</div>
            <h2>{adv.data.title} — tamom!</h2>
            <p>{adv.data.finale}</p>
            <div className="adv-final-stats">
              <span>⭐ <b>{totalStars}</b> yulduz</span>
              <span>🪙 <b>{save.coins}</b> tanga</span>
              <span>{missions.map((m) => m.rewardEmoji).join(' ')}</span>
            </div>
            <p className="adv-note">Natijangiz o‘qituvchiga yuborildi. Barakalla, {save.name}!</p>
            <div className="adv-actions"><button className="primary big" autoFocus onClick={() => setFinale(false)}>Yana sayohat qilish</button></div>
            <div className="adv-confetti" aria-hidden="true">{Array.from({ length: 50 }, (_, k) => <i key={k} style={{ left: `${(k * 41) % 100}%`, animationDelay: `${(k % 10) * 0.14}s` }} />)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StartScreen({ adv, save, onStart }: { adv: PublicAdventure; save: Save | null; onStart: (s: Save) => void }) {
  const [name, setName] = useState(save?.name ?? '');
  const [avatar, setAvatar] = useState(save?.avatar ?? AVATARS[0]);
  const [err, setErr] = useState('');
  const n = adv.data.missions.length;
  const fresh = (): Save => ({ playerId: save?.playerId ?? newId(), name: name.trim(), avatar, stars: Array(n).fill(0), done: Array(n).fill(false), coins: 0, taken: [] });
  const go = (keep: boolean) => {
    if (!name.trim()) { setErr('Ismingizni yozing'); return; }
    onStart(keep && save ? { ...save, name: name.trim(), avatar } : fresh());
  };
  return (
    <div className="adv-page">
      <div className="adv-start">
        <span className="adv-start-badge">🗺️ Sarguzasht · {adv.grade}-sinf · {n} ta missiya</span>
        <h1>{adv.data.title}</h1>
        <p className="adv-intro">{adv.data.intro}</p>
        <p className="adv-goal">🎯 {adv.data.goal}</p>
        <div className="adv-path">{adv.data.missions.map((m, k) => <span key={k} title={m.title}>{m.npcEmoji}</span>)}<span>🏆</span></div>
        <form className="adv-form" onSubmit={(e) => { e.preventDefault(); go(!!save); }}>
          <label>Ismingiz
            <input value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} maxLength={30} placeholder="Masalan: Aziza" autoFocus />
          </label>
          {err && <p className="error">{err}</p>}
          <div className="adv-avatars" role="radiogroup" aria-label="Qahramonni tanlang">
            {AVATARS.map((a) => <button type="button" key={a} role="radio" aria-checked={a === avatar} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)}>{a}</button>)}
          </div>
          <div className="adv-actions">
            <button className="primary big">{save ? '▶ Davom etish' : '🚀 Sayohatni boshlash'}</button>
            {save && <button type="button" className="ghost" onClick={() => { if (confirm('Hamma natija o‘chib, boshidan boshlanadi. Rozimisiz?')) go(false); }}>Boshidan boshlash</button>}
          </div>
          <p className="adv-keys">Boshqarish: ⬅️⬆️⬇️➡️ strelkalar yoki WASD · ekranga bosib yurish · <b>Enter</b> — gaplashish</p>
        </form>
      </div>
    </div>
  );
}
