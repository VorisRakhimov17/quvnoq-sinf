import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { SUBJECTS } from '../games';
import type { SubjectId } from '../games/types';
import type { GamePackRow } from '../pack/types';
import TopicGame from './TopicGame';

const EXAMPLES: Record<SubjectId, string> = {
  math: 'Masalan: 7 karra jadvali',
  lang: 'Masalan: Unli va undosh tovushlar',
  nature: 'Masalan: Uy hayvonlari va yovvoyi hayvonlar',
};
const GAMES_LIST = ['🧠 Viktorina', '⚖️ To‘g‘ri yoki noto‘g‘ri', '🔗 Juftini top', '🧺 Guruhlarga ajrat', '🪜 Tartibga sol'];
const COST = 1;

/** Mavzu bo'yicha 5 xil o'yindan iborat to'plam yaratish va ro'yxat */
export default function Packs({ onBuy }: { onBuy?: () => void }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { teacher, setCredits } = useAuth();
  const credits = teacher?.credits ?? 0;
  const pre = params.get('fan') as SubjectId | null;
  const [subject, setSubject] = useState<SubjectId>(pre && pre in SUBJECTS ? pre : 'math');
  const [grade, setGrade] = useState(() => Math.min(4, Math.max(1, Number(params.get('sinf')) || 1)));
  const [topic, setTopic] = useState(params.get('mavzu') ?? '');
  const [list, setList] = useState<GamePackRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');

  const load = () => api.packs().then(setList, (e: Error) => setError(e.message));
  useEffect(() => { load(); }, []);
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
      const r = await api.generatePack({ subject, grade, topic: t });
      setCredits(r.credits);
      nav(`/toplam/${r.id}`);
    } catch (err) {
      setError((err as Error).message);
      api.credits().then((d) => setCredits(d.credits), () => {});
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: GamePackRow) {
    if (!confirm(`“${p.title}” o‘yinlar to‘plamini o‘chirasizmi?`)) return;
    try { await api.deletePack(p.id); load(); } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="decks">
      <form className="form topic-form" onSubmit={generate} style={{ '--c': SUBJECTS[subject].color } as CSSProperties}>
        <h3>✨ Yangi o‘yinlar to‘plami</h3>
        <p className="muted">Mavzuni yozing — sun’iy intellekt shu mavzuda 5 xil o‘yin tayyorlaydi. Sinf bilan yoki ikki jamoa bo‘lib o‘ynaysiz.</p>
        <div className="pk-chips">{GAMES_LIST.map((g) => <span key={g}>{g}</span>)}</div>
        <div className="row">
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
        </div>
        <label>Mavzu
          <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder={EXAMPLES[subject]} disabled={busy} />
        </label>
        {error && <p className="error">{error}</p>}
        {credits < COST ? (
          <div className="notice">
            <strong>Kredit tugadi.</strong>
            <p className="muted">Yangi o‘yin yaratish uchun kredit sotib oling. Tayyor o‘yinlarni qayta o‘ynash bepul.</p>
            <button type="button" className="primary small" onClick={onBuy}>💎 Kredit sotib olish</button>
          </div>
        ) : busy ? (
          <div className="deck-wait" role="status">
            <div className="deck-wait-bar"><i style={{ width: `${Math.min(95, tick * 3)}%` }} /></div>
            <strong>{tick < 8 ? 'Savollar o‘ylanmoqda…' : tick < 16 ? 'Juftliklar va guruhlar tuzilmoqda…' : tick < 24 ? 'Javoblar tekshirilmoqda…' : 'Deyarli tayyor…'}</strong>
            <span className="muted">Odatda 20–40 soniya · {tick} s</span>
          </div>
        ) : (
          <div className="gen-row">
            <button className="primary">🎮 O‘yinlar yaratish</button>
            <span className="muted">{COST} kredit sarflanadi · qoldi: <strong>💎 {credits}</strong></span>
          </div>
        )}
      </form>

      <h3>Mening o‘yinlarim</h3>
      {!list ? <p className="muted">Yuklanmoqda…</p> : list.length === 0 ? (
        <p className="empty">Hali o‘yinlar to‘plami yo‘q. Yuqorida birinchisini yarating.</p>
      ) : (
        <div className="deck-cards">
          {list.map((p) => (
            <div key={p.id} className="deck-card" style={{ '--d1': SUBJECTS[p.subject].color } as CSSProperties}>
              <Link to={`/toplam/${p.id}`} className="deck-cover pack-cover">
                <span className="deck-emoji">{p.emoji}</span>
              </Link>
              <div className="deck-body">
                <strong>{p.title}</strong>
                <small>{SUBJECTS[p.subject].name} · {p.grade}-sinf</small>
                <small className="muted">{p.topic} · {new Date(p.createdAt).toLocaleDateString('uz-UZ')}</small>
                <div className="btn-row">
                  <Link className="primary small" to={`/toplam/${p.id}`}>▶ O‘ynash</Link>
                  <button className="ghost small" onClick={() => remove(p)}>O‘chirish</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="old-way">
        <summary>Faqat savollar yaratish (tahrirlab, “Mening savollarim”ga saqlash)</summary>
        <TopicGame onBuy={onBuy} />
      </details>
    </div>
  );
}
