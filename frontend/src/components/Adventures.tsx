import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { AdventureRow, LeaderRow } from '../adventure/types';
import { api } from '../api';
import { useAuth } from '../auth';

const EXAMPLE = 'Ikki xonali sonlarni qo‘shish\nUnli va undosh tovushlar\nFasllar va ob-havo\nUy hayvonlari';
const playUrl = (code: string) => `${window.location.origin}/sarguzasht/${code}`;

/** O'qituvchi: hafta/oy mavzularidan missiyali sarguzasht yaratadi, havolani bolalarga beradi, reytingni ko'radi */
export default function Adventures({ onBuy }: { onBuy?: () => void }) {
  const { teacher, setCredits } = useAuth();
  const credits = teacher?.credits ?? 0;
  const [cost, setCost] = useState(3);
  const [grade, setGrade] = useState(1);
  const [topics, setTopics] = useState('');
  const [wishes, setWishes] = useState('');
  const [list, setList] = useState<AdventureRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');
  const [board, setBoard] = useState<{ id: number; rows: LeaderRow[] | null } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => api.adventures().then(setList, (e: Error) => setError(e.message));
  useEffect(() => { load(); api.adventureCost().then((c) => setCost(c.cost), () => {}); }, []);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const lines = topics.split('\n').map((t) => t.trim()).filter(Boolean);

  async function generate(e: FormEvent) {
    e.preventDefault();
    if (lines.length < 2) { setError('Kamida 2 ta mavzu yozing (har biri yangi qatordan).'); return; }
    if (lines.length > 8) { setError('Ko‘pi bilan 8 ta mavzu.'); return; }
    setError(''); setBusy(true); setTick(0);
    try {
      const r = await api.generateAdventure({ grade, topics: lines, wishes: wishes.trim() || undefined });
      setCredits(r.credits);
      setTopics(''); setWishes('');
      await load();
    } catch (err) {
      setError((err as Error).message);
      api.credits().then((d) => setCredits(d.credits), () => {});
    } finally {
      setBusy(false);
    }
  }

  async function copy(code: string) {
    try { await navigator.clipboard.writeText(playUrl(code)); setCopied(code); setTimeout(() => setCopied(null), 1600); } catch { /* ignore */ }
  }

  async function openBoard(id: number) {
    if (board?.id === id) { setBoard(null); return; }
    setBoard({ id, rows: null });
    try { setBoard({ id, rows: await api.adventureLeaderboard(id) }); } catch (err) { setError((err as Error).message); setBoard(null); }
  }

  async function remove(a: AdventureRow) {
    if (!confirm(`“${a.title}” sarguzashtini o‘chirasizmi? O‘quvchilar natijalari ham o‘chadi.`)) return;
    try { await api.deleteAdventure(a.id); load(); } catch (err) { setError((err as Error).message); }
  }

  return (
    <div className="decks">
      <form className="form topic-form" onSubmit={generate}>
        <h3>✨ Yangi sarguzasht</h3>
        <p className="muted">
          Shu hafta yoki oyda o‘tiladigan mavzularni yozing — har bir mavzu sarguzashtda alohida missiya bo‘ladi.
          Bolalar qahramonni boshqarib, missiyalarni bajaradi va keyingi hududga o‘tadi.
        </p>
        <div className="row">
          <label>Sinf
            <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} disabled={busy}>
              {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}-sinf</option>)}
            </select>
          </label>
          <label>Qo‘shimcha istak <small>(ixtiyoriy)</small>
            <input value={wishes} onChange={(e) => setWishes(e.target.value)} maxLength={300} disabled={busy} placeholder="Masalan: kosmos haqida bo‘lsin" />
          </label>
        </div>
        <label>Mavzular <small>(har biri yangi qatordan, 2–8 ta) · {lines.length} ta</small>
          <textarea rows={5} value={topics} onChange={(e) => setTopics(e.target.value)} disabled={busy} placeholder={EXAMPLE} />
        </label>
        {error && <p className="error">{error}</p>}
        {credits < cost ? (
          <div className="notice">
            <strong>Kredit yetmaydi.</strong>
            <p className="muted">Bitta sarguzasht {cost} kredit turadi, sizda {credits} ta.</p>
            <button type="button" className="primary small" onClick={onBuy}>💎 Kredit sotib olish</button>
          </div>
        ) : busy ? (
          <div className="deck-wait" role="status">
            <div className="deck-wait-bar"><i style={{ width: `${Math.min(95, tick * 1.3)}%` }} /></div>
            <strong>{tick < 15 ? 'Sarguzasht syujeti o‘ylanmoqda…' : tick < 35 ? 'Missiyalar va topshiriqlar tuzilmoqda…' : tick < 55 ? 'Xarita va qahramonlar joylanmoqda…' : 'Deyarli tayyor…'}</strong>
            <span className="muted">Odatda 1 daqiqa · {tick} s</span>
          </div>
        ) : (
          <div className="gen-row">
            <button className="primary">🗺️ Sarguzasht yaratish</button>
            <span className="muted">{cost} kredit sarflanadi · qoldi: <strong>💎 {credits}</strong></span>
          </div>
        )}
      </form>

      <h3>Mening sarguzashtlarim</h3>
      {!list ? <p className="muted">Yuklanmoqda…</p> : list.length === 0 ? (
        <p className="empty">Hali sarguzasht yo‘q. Yuqorida birinchisini yarating.</p>
      ) : (
        <div className="adv-list">
          {list.map((a) => (
            <div key={a.id} className="adv-item">
              <div className="adv-item-top">
                <span className="adv-item-icon">🗺️</span>
                <div>
                  <strong>{a.title}</strong>
                  <small>{a.grade}-sinf · {a.missions} ta missiya · {a.players} ta o‘quvchi o‘ynadi</small>
                  <small className="muted">{a.topics.join(' · ')}</small>
                </div>
              </div>
              <div className="adv-share">
                <span>Bolalar uchun havola:</span>
                <code>{playUrl(a.code).replace(/^https?:\/\//, '')}</code>
                <button className="ghost small" onClick={() => copy(a.code)}>{copied === a.code ? 'Nusxalandi ✓' : 'Nusxalash'}</button>
              </div>
              <div className="btn-row">
                <Link className="primary small" to={`/sarguzasht/${a.code}`}>▶ O‘ynab ko‘rish</Link>
                <button className="ghost small" onClick={() => openBoard(a.id)}>🏅 Reyting</button>
                <button className="ghost small" onClick={() => remove(a)}>O‘chirish</button>
              </div>
              {board?.id === a.id && (
                !board.rows ? <p className="muted">Yuklanmoqda…</p> : board.rows.length === 0 ? <p className="empty">Hali hech kim o‘ynamagan. Havolani bolalarga yuboring.</p> : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>#</th><th>O‘quvchi</th><th>⭐ Yulduz</th><th>🗺️ Missiya</th><th>🪙 Tanga</th></tr></thead>
                      <tbody>
                        {board.rows.map((r, k) => (
                          <tr key={k}>
                            <td className="num">{k < 3 ? ['🥇', '🥈', '🥉'][k] : k + 1}</td>
                            <td>{r.avatar} <b>{r.name}</b>{r.finished && ' 🏆'}</td>
                            <td className="num">{r.stars}</td>
                            <td className="num">{r.missions}/{a.missions}</td>
                            <td className="num">{r.coins}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
