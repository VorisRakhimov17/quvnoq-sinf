import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { api, type CustomQuestion, type GameResult } from '../api';
import { useAuth } from '../auth';
import { SUBJECTS, gameTitle } from '../games';
import type { SubjectId } from '../games/types';

export default function TeacherPage() {
  const { teacher, loading, signOut } = useAuth();
  const [tab, setTab] = useState<'results' | 'questions'>('results');

  if (loading) return <p className="empty">Yuklanmoqda…</p>;
  if (!teacher) return <Navigate to="/kirish" replace />;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Assalomu alaykum, {teacher.name}!</h2>
          <p className="muted">{teacher.email}</p>
        </div>
        <button className="ghost" onClick={signOut}>Chiqish</button>
      </div>
      <div className="chips tabs">
        <button className="chip" aria-pressed={tab === 'results'} onClick={() => setTab('results')}>Natijalar</button>
        <button className="chip" aria-pressed={tab === 'questions'} onClick={() => setTab('questions')}>Mening savollarim</button>
      </div>
      {tab === 'results' ? <Results /> : <Questions />}
    </div>
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
                  <small>{SUBJECTS[q.subject].name} · {q.grade}-sinf · Javob: {q.answer}</small>
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
