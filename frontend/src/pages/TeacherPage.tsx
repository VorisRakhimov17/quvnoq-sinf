import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api, type CustomQuestion, type GameResult } from '../api';
import { useAuth } from '../auth';
import Credits from '../components/Credits';
import Presentations from '../components/Presentations';
import Adventures from '../components/Adventures';
import Packs from '../components/Packs';
import { topicLink } from '../components/TopicGame';
import type { PresentationRow } from '../deck/types';
import { SUBJECTS, gameTitle } from '../games';
import type { SubjectId } from '../games/types';
import { SECTIONS, type SectionId } from '../nav';
import type { GamePackRow } from '../pack/types';

const PAGE_INFO: Record<SectionId, { title: string; sub: string }> = {
  panel: { title: '', sub: '' },
  oyin: { title: '🎮 Mavzu bo‘yicha o‘yinlar', sub: 'Mavzuni yozing — 5 xil o‘yin tayyor bo‘ladi' },
  prezentatsiya: { title: '🎬 Prezentatsiyalar', sub: 'Mavzu bo‘yicha to‘liq dars slaydlari' },
  sarguzasht: { title: '🗺️ Sarguzasht o‘yinlari', sub: 'Hafta yoki oy mavzularidan missiyali o‘yin — bolalar havola orqali o‘ynaydi' },
  results: { title: '📊 Natijalar', sub: 'Sinfda o‘ynalgan o‘yinlar natijalari' },
  questions: { title: '✏️ Mening savollarim', sub: 'O‘zingiz qo‘shgan va saqlagan savollar' },
  kredit: { title: '💎 Kreditlar', sub: 'Balans, sotib olish va tarix' },
};

export default function TeacherPage() {
  const { teacher, loading, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') === 'topic' ? 'oyin' : params.get('tab');
  const tab: SectionId = SECTIONS.find((t) => t.id === raw)?.id ?? 'panel';
  const setTab = (t: SectionId) => { setParams(t === 'panel' ? {} : { tab: t }); window.scrollTo({ top: 0 }); };

  if (loading) return <p className="empty">Yuklanmoqda…</p>;
  if (!teacher) return <Navigate to="/kirish" replace />;
  const buy = () => setTab('kredit');

  return (
    <div className="dash">
      <aside className="side" aria-label="Kabinet bo‘limlari">
        <div className="side-user">
          <span className="avatar">{teacher.name.trim()[0]?.toUpperCase()}</span>
          <div><b>{teacher.name}</b><small>{teacher.email}</small></div>
        </div>
        {SECTIONS.map((s) => (
          <button key={s.id} aria-current={tab === s.id ? 'page' : undefined} onClick={() => setTab(s.id)}>
            <span className="si">{s.icon}</span>{s.label}
            {s.id === 'kredit' && <span className="count">{teacher.credits}</span>}
          </button>
        ))}
        <hr />
        {teacher.isAdmin && <Link to="/admin"><span className="si">⚙️</span>Admin</Link>}
        <button onClick={signOut}><span className="si">🚪</span>Chiqish</button>
      </aside>

      <main className="dash-main">
        {tab === 'panel' ? <Overview onGo={setTab} /> : (
          <>
            <div className="page-title">
              <div><h1>{PAGE_INFO[tab].title}</h1><p>{PAGE_INFO[tab].sub}</p></div>
            </div>
            {tab === 'prezentatsiya' ? <Presentations onBuy={buy} />
              : tab === 'oyin' ? <Packs onBuy={buy} />
                : tab === 'sarguzasht' ? <Adventures onBuy={buy} />
                : tab === 'results' ? <Results />
                  : tab === 'kredit' ? <div className="box"><Credits /></div>
                    : <div className="box"><Questions /></div>}
          </>
        )}
      </main>
    </div>
  );
}

/** Bosh panel: salomlashish, balans, asosiy harakatlar va oxirgi ishlar */
function Overview({ onGo }: { onGo: (t: SectionId) => void }) {
  const { teacher } = useAuth();
  const [packs, setPacks] = useState<GamePackRow[] | null>(null);
  const [decks, setDecks] = useState<PresentationRow[] | null>(null);
  useEffect(() => {
    api.packs().then(setPacks, () => setPacks([]));
    api.decks().then(setDecks, () => setDecks([]));
  }, []);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';

  return (
    <>
      <div className="box welcome">
        <div>
          <h1>{hello}, {teacher!.name.split(' ')[0]}! 👋</h1>
          <p>Bugun qaysi mavzuni o‘tamiz? Mavzuni yozing — qolganini biz tayyorlaymiz.</p>
        </div>
        <div className="wallet">
          <div><b>💎 {teacher!.credits}</b><small>kredit</small></div>
          <button onClick={() => onGo('kredit')}>+ Kredit olish</button>
        </div>
      </div>

      <div className="actions-grid">
        <button className="action-card" style={{ '--ac': 'var(--coral)' } as CSSProperties} onClick={() => onGo('oyin')}>
          <span className="ai">🎮</span><b>O‘yin yaratish</b>
          <p>Bir mavzudan 5 xil o‘yin: viktorina, juftini top, guruhlash va boshqalar. 1 kredit.</p>
          <span className="go">Boshlash →</span>
        </button>
        <button className="action-card" style={{ '--ac': 'var(--brand)' } as CSSProperties} onClick={() => onGo('prezentatsiya')}>
          <span className="ai">🎬</span><b>Prezentatsiya yaratish</b>
          <p>Rasmlar, misollar va savollar bilan to‘liq dars slaydlari. 3 kredit.</p>
          <span className="go">Boshlash →</span>
        </button>
        <button className="action-card" style={{ '--ac': 'var(--sun)' } as CSSProperties} onClick={() => onGo('sarguzasht')}>
          <span className="ai">🗺️</span><b>Sarguzasht yaratish</b>
          <p>Hafta mavzularidan missiyali o‘yin. Bolalar havola orqali o‘ynaydi, reytingni ko‘rasiz. 3 kredit.</p>
          <span className="go">Boshlash →</span>
        </button>
        <Link className="action-card" style={{ '--ac': 'var(--nature)' } as CSSProperties} to="/#tayyor">
          <span className="ai">🧩</span><b>Tayyor o‘yinlar</b>
          <p>Matematika, ona tili va tabiatshunoslikdan bepul o‘yinlar.</p>
          <span className="go">Ochish →</span>
        </Link>
      </div>

      <div className="box">
        <div className="recent-head"><h3>🎮 Oxirgi o‘yinlarim</h3>{!!packs?.length && <button className="linkish" onClick={() => onGo('oyin')}>Hammasi →</button>}</div>
        {!packs ? <p className="muted">Yuklanmoqda…</p> : packs.length === 0 ? <p className="empty">Hali o‘yin yaratilmagan.</p> : (
          <div className="deck-cards">
            {packs.slice(0, 3).map((p) => (
              <Link key={p.id} to={`/toplam/${p.id}`} className="deck-card" style={{ '--d1': SUBJECTS[p.subject].color, textDecoration: 'none' } as CSSProperties}>
                <span className="deck-cover pack-cover"><span className="deck-emoji">{p.emoji}</span></span>
                <span className="deck-body"><strong>{p.title}</strong><small>{SUBJECTS[p.subject].name} · {p.grade}-sinf</small></span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="box">
        <div className="recent-head"><h3>🎬 Oxirgi prezentatsiyalarim</h3>{!!decks?.length && <button className="linkish" onClick={() => onGo('prezentatsiya')}>Hammasi →</button>}</div>
        {!decks ? <p className="muted">Yuklanmoqda…</p> : decks.length === 0 ? <p className="empty">Hali prezentatsiya yaratilmagan.</p> : (
          <div className="deck-cards">
            {decks.slice(0, 3).map((p) => (
              <Link key={p.id} to={`/prezentatsiya/${p.id}`} className="deck-card" style={{
                ...(p.palette ? { '--d1': p.palette.primary, '--d2': p.palette.secondary, '--d3': p.palette.accent, '--dbg': p.palette.bg } : {}),
                textDecoration: 'none',
              } as CSSProperties}>
                <span className="deck-cover"><span className="deck-emoji">{p.emoji}</span><span className="deck-strip"><i /><i /><i /></span></span>
                <span className="deck-body"><strong>{p.title}</strong><small>{SUBJECTS[p.subject].name} · {p.grade}-sinf · {p.slides} slayd</small></span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Results() {
  const [rows, setRows] = useState<GameResult[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.results().then(setRows, (e: Error) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!rows) return <p className="muted">Yuklanmoqda…</p>;
  if (rows.length === 0) return <p className="empty">Hali natija yo‘q. O‘yin tugaganda natija shu yerda paydo bo‘ladi.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Sana</th><th>O‘yin</th><th>Sinf</th><th>Natija</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{fmtDate(r.createdAt)}</td>
              <td>{gameTitle(r.gameId)}</td>
              <td>{r.grade}-sinf</td>
              <td className="num">
                {r.teams ? `1-jamoa ${r.team1 ?? 0} : ${r.team2 ?? 0} 2-jamoa` : `${r.score} / ${r.total}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY = { subject: 'math' as SubjectId, grade: 1, prompt: '', emoji: '', options: ['', '', '', ''], answer: 0, explain: '' };

function Questions() {
  const [list, setList] = useState<CustomQuestion[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.questions().then(setList, (e: Error) => setError(e.message)); }, []);

  const setOpt = (i: number, v: string) => setForm((f) => ({ ...f, options: f.options.map((o, k) => (k === i ? v : o)) }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const filled = form.options.map((o) => o.trim());
    const answer = filled[form.answer];
    if (!answer) { setError('Belgilangan to‘g‘ri javob katagi bo‘sh.'); return; }
    const options = filled.filter(Boolean);
    if (options.length < 2) { setError('Kamida 2 ta javob varianti yozing.'); return; }
    setBusy(true);
    try {
      const q = await api.addQuestion({
        subject: form.subject, grade: form.grade, prompt: form.prompt.trim(), options, answer,
        ...(form.emoji.trim() ? { emoji: form.emoji.trim() } : {}),
        ...(form.explain.trim() ? { explain: form.explain.trim() } : {}),
      });
      setList((l) => [q, ...(l ?? [])]);
      setForm({ ...EMPTY, subject: form.subject, grade: form.grade });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await api.deleteQuestion(id);
      setList((l) => (l ?? []).filter((q) => q.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="qgrid">
      <form className="form" onSubmit={submit}>
        <h3>Yangi savol</h3>
        <div className="row">
          <label>Fan
            <select id="q-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value as SubjectId })}>
              {(Object.keys(SUBJECTS) as SubjectId[]).map((s) => <option key={s} value={s}>{SUBJECTS[s].name}</option>)}
            </select>
          </label>
          <label>Sinf
            <select id="q-grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}-sinf</option>)}
            </select>
          </label>
        </div>
        <label>Savol matni
          <input id="q-prompt" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} required maxLength={300}
            placeholder="Masalan: Bir haftada necha kun bor?" />
        </label>
        <label>Rasm (ixtiyoriy, bitta emoji)
          <input id="q-emoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={16} placeholder="📅" />
        </label>
        <fieldset>
          <legend>Javob variantlari: to‘g‘risini belgilang</legend>
          {form.options.map((o, i) => (
            <div className="opt-row" key={i}>
              <input type="radio" name="answer" id={`q-ans-${i}`} checked={form.answer === i} onChange={() => setForm({ ...form, answer: i })}
                aria-label={`${i + 1}-variant to‘g‘ri`} />
              <input id={`q-opt-${i}`} value={o} onChange={(e) => setOpt(i, e.target.value)} maxLength={60}
                placeholder={i < 2 ? `${i + 1}-variant` : `${i + 1}-variant (ixtiyoriy)`} />
            </div>
          ))}
        </fieldset>
        <label>Izoh (javobdan keyin ko‘rsatiladi, ixtiyoriy)
          <input id="q-explain" value={form.explain} onChange={(e) => setForm({ ...form, explain: e.target.value })} maxLength={300}
            placeholder="Haftada 7 kun bor: dushanbadan yakshanbagacha." />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Savolni qo‘shish'}</button>
      </form>

      <div>
        <Topics list={list} />
        <h3>Qo‘shilgan savollar {list ? `(${list.length})` : ''}</h3>
        {!list ? <p className="muted">Yuklanmoqda…</p> : list.length === 0 ? (
          <p className="empty">Hali savol yo‘q. Qo‘shgan savollaringiz bosh sahifadagi “Mening savollarim” o‘yinida chiqadi.</p>
        ) : (
          <ul className="qlist">
            {list.map((q) => (
              <li key={q.id}>
                <span className="qemoji">{q.emoji || '❓'}</span>
                <div>
                  <strong>{q.prompt}</strong>
                  <small>{SUBJECTS[q.subject].name} · {q.grade}-sinf{q.topic ? ` · ${q.topic}` : ''} · Javob: {q.answer}</small>
                </div>
                <button className="ghost small" onClick={() => remove(q.id)}>O‘chirish</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const SUBJECT_ICON: Record<SubjectId, string> = { math: '🔢', lang: '📖', nature: '🌿' };

/** Mavzular ro'yxati: har biri alohida o'yin sifatida ochiladi */
function Topics({ list }: { list: CustomQuestion[] | null }) {
  if (!list) return null;
  const map = new Map<string, { subject: SubjectId; topic: string; grade: number; n: number }>();
  for (const q of list) {
    if (!q.topic) continue;
    const k = `${q.subject}|${q.topic}`;
    const t = map.get(k);
    if (t) t.n++; else map.set(k, { subject: q.subject, topic: q.topic, grade: q.grade, n: 1 });
  }
  if (map.size === 0) return null;
  return (
    <div className="topics">
      <h3>Mavzular</h3>
      <ul className="qlist">
        {[...map.values()].map((t) => (
          <li key={`${t.subject}|${t.topic}`}>
            <span className="qemoji">{SUBJECT_ICON[t.subject]}</span>
            <div>
              <strong>{t.topic}</strong>
              <small>{SUBJECTS[t.subject].name} · {t.grade}-sinf · {t.n} ta savol</small>
            </div>
            <Link className="primary small" style={{ '--c': SUBJECTS[t.subject].color } as CSSProperties} to={topicLink(t.subject, t.topic)}>▶ O‘ynash</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
