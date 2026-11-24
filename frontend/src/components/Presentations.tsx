import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { PresentationRow } from '../deck/types';
import { SUBJECTS } from '../games';
import { gamesLink } from '../pages/PresentPage';
import type { SubjectId } from '../games/types';

const EXAMPLES: Record<SubjectId, string> = {
  math: 'Masalan: Ikki xonali sonlarni qo‘shish',
  lang: 'Masalan: Ot so‘z turkumi',
  nature: 'Masalan: Suvning tabiatdagi aylanishi',
};
const SIZES = [
  { id: 'short', label: 'Qisqa (8–10 slayd)' },
  { id: 'normal', label: 'O‘rtacha (12–14 slayd)' },
  { id: 'long', label: 'Katta (16–18 slayd)' },
] as const;
type SizeId = (typeof SIZES)[number]['id'];

/** Kutish paytida aylanib turadigan xabarlar */
const WAIT = [
  'Mavzu o‘rganilmoqda…',
  'Sarguzasht syujeti o‘ylanmoqda…',
  'Ranglar va shriftlar tanlanmoqda…',
  'Rasmlar chizilmoqda…',
  'Savollar tayyorlanmoqda…',
  'Misollar tekshirilmoqda…',
  'Oxirgi bezaklar…',
];

export default function Presentations({ onBuy }: { onBuy?: () => void }) {
  const nav = useNavigate();
  const { teacher, setCredits } = useAuth();
  const credits = teacher?.credits ?? 0;
  const [cost, setCost] = useState(3);
  const [list, setList] = useState<PresentationRow[] | null>(null);
  const [subject, setSubject] = useState<SubjectId>('math');
  const [grade, setGrade] = useState(1);
  const [topic, setTopic] = useState('');
  const [size, setSize] = useState<SizeId>('normal');
  const [wishes, setWishes] = useState('');
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');

  const load = () => api.decks().then(setList, (e: Error) => setError(e.message));
  useEffect(() => {
    load();
    api.deckCost().then((c) => setCost(c.cost), () => {});
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function generate(e: FormEvent) {
    e.preventDefault();
    const t = topic.trim();
    if (t.length < 2) { setError('Mavzuni yozing.'); return; }
    setError(''); setBusy(true); setTick(0);
    try {
      const r = await api.generateDeck({ subject, grade, topic: t, size, wishes: wishes.trim() || undefined });
      setCredits(r.credits);
      nav(`/prezentatsiya/${r.id}`);
    } catch (err) {
      setError((err as Error).message);
      api.credits().then((d) => setCredits(d.credits), () => {});
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: PresentationRow) {
    if (!confirm(`“${p.title}” prezentatsiyasini o‘chirasizmi?`)) return;
    try { await api.deleteDeck(p.id); load(); } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="decks">
      <form className="form topic-form" onSubmit={generate} style={{ '--c': SUBJECTS[subject].color } as CSSProperties}>
        <h3>Mavzu bo‘yicha dars prezentatsiyasi</h3>
        <p className="muted">
          Mavzuni yozing — sun’iy intellekt rasmlar, misollar, savollar va faollik bilan to‘liq dars tayyorlaydi.
          Har bir prezentatsiya o‘z syujeti va dizayniga ega bo‘ladi.
        </p>
        <div className="row three">
          <label>Fan
            <select value={subject} onChange={(e) => setSubject(e.target.value as SubjectId)} disabled={busy}>
              {(Object.keys(SUBJECTS) as SubjectId[]).map((s) => <option key={s} value={s}>{SUBJECTS[s].name}</option>)}
            </select>
          </label>
          <label>Sinf
            <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} disabled={busy}>
              {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}-sinf</option>)}
            </select>
          </label>
          <label>Hajmi
            <select value={size} onChange={(e) => setSize(e.target.value as SizeId)} disabled={busy}>
              {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>
        <label>Mavzu
          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder={EXAMPLES[subject]} disabled={busy} />
        </label>
        <label>Qo‘shimcha istak <small>(ixtiyoriy)</small>
          <input value={wishes} onChange={(e) => setWishes(e.target.value)} maxLength={400} disabled={busy}
            placeholder="Masalan: ko‘proq misol bo‘lsin, qahramon — mushukcha, Navro‘z bayramiga bog‘lansin" />
        </label>
        {error && <p className="error">{error}</p>}
        {credits < cost ? (
          <div className="notice">
            <strong>Kredit yetmaydi.</strong>
            <p className="muted">Bitta prezentatsiya {cost} kredit turadi, sizda {credits} ta. Tayyor prezentatsiyalarni qayta ko‘rsatish bepul.</p>
            <button type="button" className="primary small" onClick={onBuy}>💎 Kredit sotib olish</button>
          </div>
        ) : busy ? (
          <div className="deck-wait" role="status">
            <div className="deck-wait-bar"><i style={{ width: `${Math.min(95, tick * 1.1)}%` }} /></div>
            <strong>{WAIT[Math.min(WAIT.length - 1, Math.floor(tick / 12))]}</strong>
            <span className="muted">Odatda 1–2 daqiqa ketadi · {tick} s</span>
          </div>
        ) : (
          <div className="gen-row">
            <button className="primary">🎬 Prezentatsiya yaratish</button>
            <span className="muted">{cost} kredit sarflanadi · qoldi: <strong>💎 {credits}</strong></span>
          </div>
        )}
      </form>

      <h3>Mening prezentatsiyalarim</h3>
      {!list ? <p className="muted">Yuklanmoqda…</p> : list.length === 0 ? (
        <p className="empty">Hali prezentatsiya yo‘q. Yuqorida birinchisini yarating.</p>
      ) : (
        <div className="deck-cards">
          {list.map((p) => (
            <div key={p.id} className="deck-card" style={p.palette ? {
              '--d1': p.palette.primary, '--d2': p.palette.secondary, '--d3': p.palette.accent, '--dbg': p.palette.bg,
            } as CSSProperties : undefined}>
              <Link to={`/prezentatsiya/${p.id}`} className="deck-cover">
                <span className="deck-emoji">{p.emoji}</span>
                <span className="deck-strip"><i /><i /><i /></span>
              </Link>
              <div className="deck-body">
                <strong>{p.title}</strong>
                <small>{SUBJECTS[p.subject].name} · {p.grade}-sinf · {p.slides} slayd</small>
                <small className="muted">{p.style.split(' | ')[2] ?? ''} · {new Date(p.createdAt).toLocaleDateString('uz-UZ')}</small>
                <div className="btn-row">
                  <Link className="primary small" to={`/prezentatsiya/${p.id}`}>▶ Ko‘rsatish</Link>
                  <Link className="ghost small" to={gamesLink(p)} title="Shu mavzuda o‘yinlar yaratish">🎮 O‘yin</Link>
                  <button className="ghost small" onClick={() => remove(p)}>O‘chirish</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
