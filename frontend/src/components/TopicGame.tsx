import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { SUBJECTS } from '../games';
import type { SubjectId } from '../games/types';

/** Tahrirlanadigan savol: to'g'ri javob variant raqami bilan saqlanadi */
type Draft = { prompt: string; emoji: string; options: string[]; answer: number; explain: string };

const EXAMPLES: Record<SubjectId, string> = {
  math: 'Masalan: 7 karra jadvali',
  lang: 'Masalan: Unli va undosh tovushlar',
  nature: 'Masalan: Uy hayvonlari va yovvoyi hayvonlar',
};

export const topicLink = (subject: SubjectId, topic: string) =>
  `/oyin/mening-${subject}?mavzu=${encodeURIComponent(topic)}`;

export default function TopicGame({ onSaved }: { onSaved?: () => void }) {
  const nav = useNavigate();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [subject, setSubject] = useState<SubjectId>('math');
  const [grade, setGrade] = useState(1);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [made, setMade] = useState<{ subject: SubjectId; grade: number; topic: string } | null>(null);
  const [busy, setBusy] = useState<'' | 'gen' | 'save'>('');
  const [error, setError] = useState('');

  useEffect(() => { api.aiStatus().then((s) => setEnabled(s.enabled), () => setEnabled(false)); }, []);

  async function generate(e?: FormEvent) {
    e?.preventDefault();
    const t = topic.trim();
    if (t.length < 2) { setError('Mavzuni yozing.'); return; }
    setError(''); setBusy('gen');
    try {
      const qs = await api.aiGenerate({ subject, grade, topic: t, count });
      setDrafts(qs.map((q) => ({ ...q, answer: Math.max(0, q.options.indexOf(q.answer)) })));
      setMade({ subject, grade, topic: t });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  const edit = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d!.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const editOpt = (i: number, j: number, v: string) =>
    edit(i, { options: drafts![i].options.map((o, k) => (k === j ? v : o)) });

  async function save(play: boolean) {
    if (!drafts || !made) return;
    setError('');
    const out = [];
    for (const [i, d] of drafts.entries()) {
      const options = d.options.map((o) => o.trim());
      const answer = options[d.answer];
      const filled = options.filter(Boolean);
      if (!d.prompt.trim()) { setError(`${i + 1}-savol matni bo‘sh.`); return; }
      if (!answer) { setError(`${i + 1}-savol: to‘g‘ri javob katagi bo‘sh.`); return; }
      if (filled.length < 2) { setError(`${i + 1}-savol: kamida 2 ta variant kerak.`); return; }
      if (new Set(filled).size !== filled.length) { setError(`${i + 1}-savol: variantlar takrorlanmasin.`); return; }
      out.push({
        subject: made.subject, grade: made.grade, topic: made.topic, prompt: d.prompt.trim(), options: filled, answer,
        ...(d.emoji.trim() ? { emoji: d.emoji.trim() } : {}),
        ...(d.explain.trim() ? { explain: d.explain.trim() } : {}),
      });
    }
    if (out.length === 0) { setError('Saqlash uchun savol qolmadi.'); return; }
    setBusy('save');
    try {
      await api.addQuestions(out);
      onSaved?.();
      if (play) nav(topicLink(made.subject, made.topic));
      else { setDrafts(null); setMade(null); setTopic(''); }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  if (enabled === null) return <p className="muted">Yuklanmoqda…</p>;
  if (!enabled) {
    return (
      <div className="notice">
        <strong>AI hali ulanmagan.</strong>
        <p className="muted">
          <code>backend/.env</code> fayliga <code>ANTHROPIC_API_KEY=…</code> qatorini qo‘shing va backendni qayta ishga tushiring.
        </p>
      </div>
    );
  }

  return (
    <div className="topic">
      <form className="form topic-form" onSubmit={generate} style={{ '--c': SUBJECTS[subject].color } as CSSProperties}>
        <h3>Bugungi mavzu bo‘yicha o‘yin</h3>
        <p className="muted">Mavzuni yozing — sun’iy intellekt savollarni tayyorlaydi. Keyin ularni tekshirib, tuzatib, saqlaysiz.</p>
        <div className="row three">
          <label>Fan
            <select value={subject} onChange={(e) => setSubject(e.target.value as SubjectId)}>
              {(Object.keys(SUBJECTS) as SubjectId[]).map((s) => <option key={s} value={s}>{SUBJECTS[s].name}</option>)}
            </select>
          </label>
          <label>Sinf
            <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}-sinf</option>)}
            </select>
          </label>
          <label>Savollar soni
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[5, 10, 15].map((n) => <option key={n} value={n}>{n} ta</option>)}
            </select>
          </label>
        </div>
        <label>Mavzu
          <input id="ai-topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder={EXAMPLES[subject]} />
        </label>
        {error && !drafts && <p className="error">{error}</p>}
        <button className="primary" disabled={busy !== ''}>
          {busy === 'gen' ? 'Savollar tayyorlanmoqda… (20–60 soniya)' : drafts ? '↻ Qaytadan yaratish' : '✨ O‘yin yaratish'}
        </button>
      </form>

      {drafts && made && (
        <div className="drafts">
          <div className="drafts-head">
            <h3>“{made.topic}” · {SUBJECTS[made.subject].name} · {made.grade}-sinf ({drafts.length} ta savol)</h3>
            <p className="muted">Tekshirib chiqing: matnni tuzatish, to‘g‘ri javobni almashtirish yoki savolni o‘chirish mumkin.</p>
          </div>
          <ol className="draft-list">
            {drafts.map((d, i) => (
              <li key={i} className="form draft">
                <div className="draft-top">
                  <input className="emoji-in" value={d.emoji} onChange={(e) => edit(i, { emoji: e.target.value })} maxLength={16} aria-label="Rasm (emoji)" />
                  <input className="prompt-in" value={d.prompt} onChange={(e) => edit(i, { prompt: e.target.value })} maxLength={300} aria-label={`${i + 1}-savol matni`} />
                  <button type="button" className="ghost small" onClick={() => setDrafts(drafts.filter((_, k) => k !== i))}>O‘chirish</button>
                </div>
                <div className="draft-opts">
                  {d.options.map((o, j) => (
                    <div className="opt-row" key={j}>
                      <input type="radio" name={`ans-${i}`} checked={d.answer === j} onChange={() => edit(i, { answer: j })} aria-label={`${j + 1}-variant to‘g‘ri`} />
                      <input value={o} onChange={(e) => editOpt(i, j, e.target.value)} maxLength={60} className={d.answer === j ? 'is-right' : ''} />
                    </div>
                  ))}
                </div>
                <input value={d.explain} onChange={(e) => edit(i, { explain: e.target.value })} maxLength={300} placeholder="Izoh (ixtiyoriy)" aria-label="Izoh" />
              </li>
            ))}
          </ol>
          {error && <p className="error">{error}</p>}
          <div className="drafts-actions">
            <button className="primary" disabled={busy !== '' || drafts.length === 0} onClick={() => save(true)}>
              {busy === 'save' ? 'Saqlanmoqda…' : '▶ Saqlash va o‘ynash'}
            </button>
            <button className="ghost" disabled={busy !== '' || drafts.length === 0} onClick={() => save(false)}>Faqat saqlash</button>
            <button className="ghost" disabled={busy !== ''} onClick={() => { setDrafts(null); setMade(null); }}>Bekor qilish</button>
          </div>
        </div>
      )}
    </div>
  );
}
