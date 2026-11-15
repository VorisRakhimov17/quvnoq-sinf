import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, type CustomQuestion } from '../api';
import { useAuth } from '../auth';
import BuildAnswer from '../components/BuildAnswer';
import Visual, { VowelWord } from '../components/Visual';
import { GAMES, SUBJECTS } from '../games';
import type { ChoiceQ, GameDef, Question } from '../games/types';
import { shuffle, toOpts } from '../games/util';
import type { SettingsApi } from '../settings';
import { beep } from '../sound';

const PRAISE = ['Barakalla!', 'Zo‘r!', 'Ofarin!', 'Juda yaxshi!', 'Qoyil!', 'To‘g‘ri!'];
const ROUND = 10;

function customToQ(c: CustomQuestion): ChoiceQ {
  return {
    kind: 'choice', key: `c${c.id}`, ask: c.prompt,
    visual: { type: 'pic', emoji: c.emoji || '❓' },
    options: toOpts(shuffle(c.options), c.options.some((o) => o.length > 6)),
    answer: c.answer, explain: c.explain ?? undefined,
  };
}

export default function GamePage({ settings }: { settings: SettingsApi }) {
  const { id } = useParams();
  const [search] = useSearchParams();
  const topic = search.get('mavzu') || undefined;
  const game = GAMES.find((g) => g.id === id);
  const { teacher, loading } = useAuth();
  const [pool, setPool] = useState<ChoiceQ[] | null>(null);
  const [topicGrade, setTopicGrade] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!game?.custom || loading) return;
    if (!teacher) { setError('Bu o‘yin uchun o‘qituvchi sifatida kiring.'); return; }
    // Mavzu tanlangan bo'lsa: o'sha mavzuning hamma savollari (sinfdan qat'i nazar), aks holda 10 tasi
    const req = topic ? api.questions({ subject: game.subject, topic }) : api.questions({ subject: game.subject, grade: settings.grade });
    req
      .then((qs) => {
        setTopicGrade(topic && qs.length ? qs[0].grade : null);
        setPool(shuffle(qs).slice(0, topic ? 30 : ROUND).map(customToQ));
      })
      .catch((e: Error) => setError(e.message));
  }, [game, teacher, loading, settings.grade, topic]);

  const again = () => {
    if (pool) setPool(shuffle(pool).map((q) => ({ ...q, options: shuffle(q.options) })));
    setRun((r) => r + 1);
  };

  if (!game) return <p className="empty">O‘yin topilmadi. <Link to="/">Bosh sahifa</Link></p>;
  const style = { '--c': SUBJECTS[game.subject].color } as CSSProperties;

  if (game.custom) {
    if (error) return <Notice style={style} text={error} />;
    if (!pool) return <Notice style={style} text="Savollar yuklanmoqda…" />;
    if (pool.length === 0)
      return <Notice style={style} text={topic ? `“${topic}” mavzusida savol topilmadi.` : `${settings.grade}-sinf uchun bu fanda hali savol qo‘shilmagan. Kabinetdan savol qo‘shing.`} />;
  }

  const total = game.custom ? pool!.length : ROUND;
  const makeQ = game.custom ? (i: number) => pool![i] : () => game.gen!(settings.grade);
  return (
    <section style={style}>
      <Round key={run} game={topic ? { ...game, title: topic } : game} total={total} makeQ={makeQ}
        settings={topicGrade ? { ...settings, grade: topicGrade as SettingsApi['grade'] } : settings} onAgain={again} />
    </section>
  );
}

function Notice({ text, style }: { text: string; style: CSSProperties }) {
  return (
    <section style={style}>
      <div className="gbar"><Link className="ghost" to="/">← Bosh sahifa</Link></div>
      <div className="board"><p className="ask">{text}</p><Link className="primary" to="/kabinet">Kabinetga o‘tish</Link></div>
    </section>
  );
}

type RoundProps = {
  game: GameDef; total: number; makeQ: (i: number) => Question; settings: SettingsApi; onAgain: () => void;
};

function Round({ game, total, makeQ, settings, onAgain }: RoundProps) {
  const nav = useNavigate();
  const { teacher } = useAuth();
  const used = useRef(new Set<string>());
  const fresh = useCallback((i: number) => {
    for (let t = 0; t < 40; t++) {
      const q = makeQ(i);
      if (!used.current.has(q.key)) { used.current.add(q.key); return q; }
    }
    return makeQ(i);
  }, [makeQ]);

  const [i, setI] = useState(0);
  const [q, setQ] = useState<Question>(() => fresh(0));
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [lastOk, setLastOk] = useState(false);
  const [praise, setPraise] = useState(PRAISE[0]);
  const [score, setScore] = useState(0);
  const [ts, setTs] = useState<[number, number]>([0, 0]);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState<'idle' | 'saved' | 'error'>('idle');
  const nextBtn = useRef<HTMLButtonElement>(null);
  const team = i % 2;
  const teams = settings.teams;

  function finish(ok: boolean) {
    setDone(true);
    setLastOk(ok);
    setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    if (ok) {
      setScore((s) => s + 1);
      setTs((t) => (team === 0 ? [t[0] + 1, t[1]] : [t[0], t[1] + 1]));
    }
    if (settings.sound) beep(ok);
  }

  function choose(v: string) {
    if (done || q.kind !== 'choice') return;
    setPicked(v);
    finish(v === q.answer);
  }

  function advance() {
    if (!done) return;
    if (i + 1 >= total) { setFinished(true); return; }
    setI(i + 1);
    setQ(fresh(i + 1));
    setDone(false);
    setPicked(null);
  }

  useEffect(() => { if (done) nextBtn.current?.focus({ preventScroll: true }); }, [done]);

  useEffect(() => {
    if (!finished || !teacher) return;
    api.saveResult({
      gameId: game.id, grade: settings.grade, teams, total, score,
      ...(teams ? { team1: ts[0], team2: ts[1] } : {}),
    }).then(() => setSaved('saved'), () => setSaved('error'));
    if (settings.sound && (teams || score >= total * 0.6)) beep(true);
    // faqat raund tugaganda bir marta saqlanadi
  }, [finished]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished) return;
      if (!done && q.kind === 'choice' && /^[1-9]$/.test(e.key)) {
        const o = q.options[Number(e.key) - 1];
        if (o) { e.preventDefault(); choose(o.v); }
      } else if (done && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const progress = finished ? 100 : ((i + (done ? 1 : 0)) / total) * 100;
  const answerLabel = q.answerLabel ?? (q.kind === 'choice' ? q.answer : q.answer.join(''));

  return (
    <>
      <div className="gbar">
        <button className="ghost" onClick={() => nav('/')}>← Bosh sahifa</button>
        <div className="gtitle">
          <span>{SUBJECTS[game.subject].name} · {settings.grade}-sinf</span>
          <strong>{game.title}</strong>
        </div>
        <div className="gtools">
          <span className="pill">{Math.min(i + 1, total)} / {total}</span>
          {teams ? (
            [0, 1].map((t) => (
              <span key={t} className={`pill team t${t + 1}${!finished && team === t ? ' active' : ''}`}>
                {t + 1}-jamoa: {ts[t]}
              </span>
            ))
          ) : (
            <span className="pill">To‘g‘ri: {score}</span>
          )}
          <button className="ghost" onClick={() => settings.update({ sound: !settings.sound })}>
            {settings.sound ? 'Ovoz: yoqiq' : 'Ovoz: o‘chiq'}
          </button>
          <button className="ghost" onClick={toggleFs}>{fs ? 'Kichik ekran' : 'Katta ekran'}</button>
        </div>
      </div>
      <div className="progress"><i style={{ width: `${progress}%` }} /></div>

      {finished ? (
        <div className="board end">
          {teams ? (
            <>
              <h2>{ts[0] > ts[1] ? '1-jamoa g‘olib!' : ts[1] > ts[0] ? '2-jamoa g‘olib!' : 'Durang! Ikkala jamoa ham zo‘r!'}</h2>
              <div className="teams-result">
                <div className="t1">1-jamoa<b>{ts[0]}</b>{Math.ceil(total / 2)} tadan</div>
                <div className="t2">2-jamoa<b>{ts[1]}</b>{Math.floor(total / 2)} tadan</div>
              </div>
            </>
          ) : (
            <Stars score={score} total={total} />
          )}
          {teacher && (
            <p className="save-note">
              {saved === 'saved' ? 'Natija kabinetga saqlandi.' : saved === 'error' ? 'Natijani saqlab bo‘lmadi.' : 'Natija saqlanmoqda…'}
            </p>
          )}
          <div className="actions">
            <button className="primary" autoFocus onClick={onAgain}>Yana o‘ynash</button>
            <button className="ghost" onClick={() => nav('/')}>Boshqa o‘yin</button>
          </div>
        </div>
      ) : (
        <div className="board">
          {teams && <div className={`turn t${team + 1}`}>Navbat: {team + 1}-jamoa</div>}
          <p className="ask">
            {q.ask}
            {q.askNote && <small>{q.askNote}</small>}
          </p>
          <div className="prompt"><Visual v={q.visual} /></div>

          {q.kind === 'choice' ? (
            <div className="answers">
              {q.options.map((o, n) => {
                let cls = 'opt' + (o.text ? ' text' : '');
                if (done) cls += o.v === q.answer ? ' ok' : o.v === picked ? ' bad' : ' dim';
                return (
                  <button key={o.v} className={cls} disabled={done} onClick={() => choose(o.v)}>
                    <kbd>{n + 1}</kbd>{o.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <BuildAnswer key={q.key + i} q={q} locked={done} onDone={finish} />
          )}

          <div className="feedback" aria-live="polite">
            {done && (
              <>
                {lastOk ? <span className="yes">{praise}</span> : <><span className="no">Afsus.</span> To‘g‘ri javob: <b>{answerLabel}</b></>}
                {q.vowelWord && <span className="note"><VowelWord word={q.vowelWord} /></span>}
                {q.explain && <span className="note">{q.explain}</span>}
              </>
            )}
          </div>
          {done && (
            <button ref={nextBtn} className="primary" onClick={advance}>
              {i + 1 >= total ? 'Natijani ko‘rish' : 'Keyingi savol →'}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function Stars({ score, total }: { score: number; total: number }) {
  const p = score / total;
  const n = p >= 0.9 ? 3 : p >= 0.6 ? 2 : 1;
  const msg = n === 3 ? 'Ajoyib! Barakalla!' : n === 2 ? 'Yaxshi natija!' : 'Yana bir bor urinib ko‘ramiz!';
  return (
    <>
      <div className="stars">
        {[0, 1, 2].map((k) => (
          <svg key={k} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"
              fill={k < n ? 'var(--star)' : 'var(--line)'} stroke={k < n ? 'var(--star)' : 'var(--line)'}
              strokeWidth="1.2" strokeLinejoin="round"
            />
          </svg>
        ))}
      </div>
      <h2>{msg}</h2>
      <p>{total} ta savoldan {score} tasiga to‘g‘ri javob berildi.</p>
    </>
  );
}
