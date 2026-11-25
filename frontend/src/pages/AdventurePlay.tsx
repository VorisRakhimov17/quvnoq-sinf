import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { music, musicEnabled, setMusic, setSfx, sfx, sfxEnabled } from '../adventure/audio';
import Engine from '../adventure/Engine';
import MissionDialog from '../adventure/MissionDialog';
import { HEROES, LOST, SHOP, item, medal } from '../adventure/shop';
import type { PublicAdventure, Save } from '../adventure/types';
import { buildWorld } from '../adventure/world';
import '../adventure/adventure.css';
import { api } from '../api';
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
  const [sound, setSound] = useState(sfxEnabled);
  const [tune, setTune] = useState(musicEnabled);
  const [shop, setShop] = useState(false);
  const [toast, setToast] = useState('');
  const toastT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    api.playAdventure(code).then((a) => { setAdv(a); setSave(store.get(code)); }, (e: Error) => setError(e.message));
  }, [code]);

  // Fon musiqasi faqat o'yin paytida
  useEffect(() => { music(playing); return () => music(false); }, [playing]);

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
      stars: s.stars.reduce((a, b) => a + b, 0), coins: s.coins + (s.spent ?? 0), missions: done, finished: done === missions.length,
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
  const owned = save.owned ?? [];
  const lostOf = (k: number) => world.lost.filter((l) => l.k === k);
  const questK = save.quest && !save.done[save.quest.k] ? save.quest.k : -1;
  const questInfo = (k: number) => {
    const total = lostOf(k).length;
    if (save.done[k] || !total) return null;
    const lz = LOST[missions[k].zone] ?? LOST.meadow;
    const started = save.quest?.k === k;
    return { e: lz.e, name: lz.name, total, started, got: started ? save.quest!.got.length : 0 };
  };
  const qi = questK >= 0 ? questInfo(questK) : null;

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
          {qi && qi.got < qi.total && <span className="adv-qchip" title="Qidirilayotgan buyumlar">🔍 {qi.e} {qi.got}/{qi.total}</span>}
          <span className="adv-bag" title="Mukofotlar">{missions.map((m, k) => <i key={k} className={save.done[k] ? 'got' : ''}>{save.done[k] ? m.rewardEmoji : '◻️'}</i>)}</span>
          <button className="adv-shopbtn" onClick={() => { setShop(true); sfx.talk(); }} title="Do‘kon: shapka va do‘stlar">🛍️ Do‘kon</button>
          <button onClick={() => { setSfx(!sound); setSound(!sound); }} aria-label="Ovoz effektlari" title="Ovoz effektlari">{sound ? '🔊' : '🔇'}</button>
          <button onClick={() => { setMusic(!tune, true); setTune(!tune); }} aria-label="Musiqa" title="Fon musiqasi" className={tune ? '' : 'off'}>🎵</button>
          <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})} aria-label="To‘liq ekran">⛶</button>
        </div>
      </header>

      <Engine
        world={world} missions={missions} done={save.done} taken={save.taken} avatar={save.avatar} name={save.name}
        hat={item(save.hat)?.e} pet={item(save.pet)?.e} quest={qi && save.quest ? { k: questK, got: save.quest.got, e: qi.e } : null}
        paused={open !== null || finale || shop} start={save.pos ?? { x: world.spawn.x + 0.5, y: world.spawn.y + 0.5 }}
        onCoin={(id) => {
          if (save.taken.includes(id)) return;
          sfx.coin();
          update((s) => (s.taken.includes(id) ? s : { ...s, coins: s.coins + 1, taken: [...s.taken, id] }));
        }}
        onFind={(id) => {
          if (!save.quest || save.quest.got.includes(id)) return;
          sfx.find();
          const left = lostOf(save.quest.k).length - save.quest.got.length - 1;
          const k = save.quest.k;
          update((s) => (!s.quest || s.quest.got.includes(id) ? s : { ...s, quest: { ...s.quest, got: [...s.quest.got, id] } }));
          if (left === 0) { flash(`🎉 Hammasini topdingiz! Endi ${missions[k].npcEmoji} ${missions[k].npcName} oldiga qayting`); setTimeout(() => sfx.ok(), 300); }
        }}
        onTalk={(k) => setOpen(k)}
        onChest={() => {
          if (save.done.every(Boolean)) {
            setFinale(true);
            sfx.fanfare();
            // Xazina sovg'asi: oltin toj (bir marta), darhol kiyiladi
            if (!owned.includes('crown')) update((s) => ({ ...s, owned: [...(s.owned ?? []), 'crown'], hat: 'crown' }));
          }
          else flash(`🎁 Xazina yopiq. Avval ${n - doneCount} ta missiyani bajaring.`);
        }}
        onPos={(p) => update((s) => ({ ...s, pos: p }))}
      />

      {doneCount === 0 && open === null && <div className="adv-hint">👉 Yo‘l bo‘ylab o‘ngga yuring: <b>strelkalar</b> yoki ekranga bosing</div>}
      {toast && <div className="adv-toast">{toast}</div>}

      {open !== null && (
        <MissionDialog
          mission={missions[open]} index={open} hero={save.name} best={save.stars[open]} doneBefore={save.done[open]}
          quest={questInfo(open)}
          onQuest={() => update((s) => ({ ...s, quest: { k: open, got: [] } }))}
          onClose={() => setOpen(null)}
          onFinish={(stars, passed, coins) => {
            let next: Save | null = null;
            update((s) => {
              const st = [...s.stars]; st[open] = Math.max(st[open], stars);
              const dn = [...s.done]; if (passed) dn[open] = true;
              next = { ...s, stars: st, done: dn, coins: s.coins + coins, quest: passed && s.quest?.k === open ? null : s.quest };
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
            {(() => { const md = medal(totalStars, missions.reduce((a, m) => a + m.tasks.length, 0)); return <div className="adv-medal"><span>{md.e}</span><b>{md.name}</b></div>; })()}
            <div className="adv-reward"><span>👑</span><div><small>Xazinadagi sovg‘a:</small><b>Oltin toj — qahramoningiz endi uni kiyadi!</b></div></div>
            <div className="adv-final-stats">
              <span>⭐ <b>{totalStars}</b> yulduz</span>
              <span>🪙 <b>{save.coins}</b> tanga</span>
              <span>{missions.map((m) => m.rewardEmoji).join(' ')}</span>
            </div>
            <p className="adv-note">Natijangiz o‘qituvchiga yuborildi. Barakalla, {save.name}!</p>
            <div className="adv-actions">
              <button className="primary big" autoFocus onClick={() => setFinale(false)}>Yana sayohat qilish</button>
              <button className="ghost" onClick={() => { setFinale(false); setShop(true); }}>🛍️ Do‘konga kirish</button>
            </div>
            <div className="adv-confetti" aria-hidden="true">{Array.from({ length: 50 }, (_, k) => <i key={k} style={{ left: `${(k * 41) % 100}%`, animationDelay: `${(k % 10) * 0.14}s` }} />)}</div>
          </div>
        </div>
      )}

      {shop && (
        <Shop
          save={save} onClose={() => setShop(false)}
          onBuy={(id) => {
            const it = item(id)!;
            if (owned.includes(id) || save.coins < it.price) return;
            sfx.buy();
            update((s) => ({ ...s, coins: s.coins - it.price, spent: (s.spent ?? 0) + it.price, owned: [...(s.owned ?? []), id], [it.slot]: id }));
          }}
          onWear={(slot, id) => { sfx.talk(); update((s) => ({ ...s, [slot]: s[slot] === id ? undefined : id })); }}
          onHero={(e) => { sfx.talk(); update((s) => ({ ...s, avatar: e })); }}
        />
      )}
    </div>
  );
}

/** Do'kon: tangaga shapka va ergashuvchi do'st olish, qahramonni almashtirish */
function Shop({ save, onClose, onBuy, onWear, onHero }: {
  save: Save; onClose: () => void; onBuy: (id: string) => void; onWear: (slot: 'hat' | 'pet', id: string) => void; onHero: (e: string) => void;
}) {
  const owned = save.owned ?? [];
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  const row = (slot: 'hat' | 'pet') => SHOP.filter((s) => s.slot === slot).map((it) => {
    const has = owned.includes(it.id);
    const worn = save[slot] === it.id;
    const can = !has && !it.prize && save.coins >= it.price;
    return (
      <div key={it.id} className={'adv-sitem' + (worn ? ' worn' : '') + (!has && !can ? ' locked' : '')}>
        <span className="adv-sitem-e">{it.e}</span>
        <b>{it.name}</b>
        {has ? (
          <button className={worn ? 'ghost small' : 'primary small'} onClick={() => onWear(slot, it.id)}>{worn ? 'Yechish' : 'Kiyish'}</button>
        ) : it.prize ? (
          <small>🏆 Xazinada</small>
        ) : (
          <button className="primary small" disabled={!can} onClick={() => onBuy(it.id)}>🪙 {it.price}</button>
        )}
      </div>
    );
  });
  return (
    <div className="adv-modal" role="dialog" aria-modal="true" aria-label="Do‘kon" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adv-card adv-shop">
        <div className="adv-card-head">
          <span className="adv-npc">🛍️</span>
          <div><small>Tangalarni sarflang</small><b>Do‘kon</b></div>
          <span className="adv-wallet">🪙 {save.coins}</span>
          <button className="adv-x" onClick={onClose} aria-label="Yopish">✕</button>
        </div>
        <div className="adv-body">
          <div className="adv-preview">
            <span className="adv-preview-hat">{item(save.hat)?.e ?? ''}</span>
            <span className="adv-preview-hero">{save.avatar}</span>
            <span className="adv-preview-pet">{item(save.pet)?.e ?? ''}</span>
            <b>{save.name}</b>
          </div>
          <h4>Qahramon</h4>
          <div className="adv-heroes">
            {HEROES.map((h) => <button key={h.e} className={save.avatar === h.e ? 'on' : ''} onClick={() => onHero(h.e)} title={h.name}>{h.e}</button>)}
          </div>
          <h4>Shapkalar</h4>
          <div className="adv-items">{row('hat')}</div>
          <h4>Ergashuvchi do‘stlar</h4>
          <div className="adv-items">{row('pet')}</div>
          <p className="adv-note">Tangalar yo‘lda yig‘iladi va har bir missiya yulduzi uchun beriladi.</p>
        </div>
      </div>
    </div>
  );
}

function StartScreen({ adv, save, onStart }: { adv: PublicAdventure; save: Save | null; onStart: (s: Save) => void }) {
  const [name, setName] = useState(save?.name ?? '');
  const [avatar, setAvatar] = useState(save?.avatar ?? HEROES[0].e);
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
          <div className="adv-pick">
            <div className="adv-pick-hero" key={avatar}><span>{avatar}</span><b>{name.trim() || HEROES.find((h) => h.e === avatar)?.name}</b></div>
            <div className="adv-avatars" role="radiogroup" aria-label="Qahramonni tanlang">
              {HEROES.map((h) => <button type="button" key={h.e} role="radio" title={h.name} aria-checked={h.e === avatar} className={h.e === avatar ? 'on' : ''} onClick={() => { setAvatar(h.e); sfx.talk(); }}>{h.e}</button>)}
            </div>
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
