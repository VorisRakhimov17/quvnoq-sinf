import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { SUBJECTS } from '../games';
import { OrderGame, PairsGame, QuizGame, SortGame, TrueFalseGame, type Outcome, type Progress } from '../pack/Games';
import type { GamePack, PackData, PackGameId } from '../pack/types';
import '../pack/pack.css';
import type { SettingsApi } from '../settings';
import { beep } from '../sound';

const META: Record<PackGameId, { name: string; icon: string; hint: string; color: string; teams: boolean }> = {
  quiz: { name: 'Viktorina', icon: '🧠', hint: '4 ta javobdan to‘g‘risini tanlang', color: '#2D5BE3', teams: true },
  truefalse: { name: 'To‘g‘ri yoki noto‘g‘ri?', icon: '⚖️', hint: 'Gap to‘g‘rimi? Tez o‘ylang!', color: '#1C8C4E', teams: true },
  pairs: { name: 'Juftini top', icon: '🔗', hint: 'Mos kartalarni ulang', color: '#B8317F', teams: false },
  sort: { name: 'Guruhlarga ajrat', icon: '🧺', hint: 'Har birini o‘z guruhiga joylang', color: '#D9691A', teams: true },
  order: { name: 'Tartibga sol', icon: '🪜', hint: 'To‘g‘ri ketma-ketlikni tuzing', color: '#7A4FD6', teams: false },
};
const ORDER: PackGameId[] = ['quiz', 'truefalse', 'pairs', 'sort', 'order'];

const count = (d: PackData, g: PackGameId) =>
  g === 'quiz' ? d.quiz.length : g === 'truefalse' ? d.truefalse.length : g === 'pairs' ? d.pairs.items.length
    : g === 'sort' ? d.sort.items.length : d.order.length;
const unit = (g: PackGameId) => (g === 'pairs' ? 'juftlik' : g === 'order' ? 'topshiriq' : g === 'sort' ? 'ta narsa' : 'ta savol');
const starsOf = (o: Outcome) => { const p = o.total ? o.score / o.total : 0; return p >= 0.9 ? 3 : p >= 0.6 ? 2 : 1; };

export default function PackPage({ settings }: { settings: SettingsApi }) {
  const { id } = useParams();
  const [pack, setPack] = useState<GamePack | null>(null);
  const [error, setError] = useState('');
  const [game, setGame] = useState<PackGameId | null>(null);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<Outcome | null>(null);
  const [best, setBest] = useState<Partial<Record<PackGameId, number>>>({});
  const [prog, setProg] = useState<Progress>({ done: 0, at: 0, total: 1, score: 0, team: 0, ts: [0, 0] });
  const [fs, setFs] = useState(false);

  useEffect(() => { api.pack(Number(id)).then(setPack, (e: Error) => setError(e.message)); }, [id]);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const onProgress = useCallback((p: Progress) => setProg(p), []);
  const teamsOn = !!game && META[game].teams && settings.teams;

  const finish = (o: Outcome) => {
    setResult(o);
    const s = starsOf(o);
    setBest((b) => ({ ...b, [game!]: Math.max(b[game!] ?? 0, s) }));
    if (settings.sound && (o.teams || s >= 2)) setTimeout(() => beep(true), 300);
    api.saveResult({
      gameId: `pack-${game}`, grade: pack!.grade, teams: !!o.teams, total: o.total, score: o.score,
      ...(o.teams ? { team1: o.teams[0], team2: o.teams[1] } : {}),
    }).catch(() => {});
  };
  const start = (g: PackGameId) => { setGame(g); setResult(null); setRun((r) => r + 1); };

  if (error) return <p className="empty">{error} <Link to="/kabinet?tab=oyin">Orqaga</Link></p>;
  if (!pack) return <p className="empty">Yuklanmoqda…</p>;
  const d = pack.data;
  const style = { '--c': SUBJECTS[pack.subject].color } as CSSProperties;
  const games = ORDER.filter((g) => count(d, g) > 0);

  const tools = (
    <div className="gtools">
      <button className="ghost" onClick={() => settings.update({ sound: !settings.sound })}>{settings.sound ? '🔊 Ovoz' : '🔇 Ovozsiz'}</button>
      <button className="ghost" onClick={toggleFs}>{fs ? 'Kichik ekran' : '⛶ Katta ekran'}</button>
    </div>
  );

  // ---- Menyu ----
  if (!game) {
    return (
      <section className="pk" style={style}>
        <div className="gbar">
          <Link className="ghost" to="/kabinet?tab=oyin">← Kabinet</Link>
          {tools}
        </div>
        <div className="pk-hero">
          <span className="pk-hero-emoji">{d.emoji}</span>
          <div>
            <span className="pk-sub">{SUBJECTS[pack.subject].name} · {pack.grade}-sinf · {pack.topic}</span>
            <h1>{d.title || pack.topic}</h1>
          </div>
          <label className="pk-teams">
            <input type="checkbox" checked={settings.teams} onChange={(e) => settings.update({ teams: e.target.checked })} />
            <span>👥 Ikki jamoa bo‘lib o‘ynash</span>
          </label>
        </div>
        <div className="pk-menu">
          {games.map((g, k) => (
            <button key={g} className="pk-card" style={{ '--gc': META[g].color, '--k': k } as CSSProperties} onClick={() => start(g)}>
              <span className="pk-card-icon">{META[g].icon}</span>
              <strong>{META[g].name}</strong>
              <small>{META[g].hint}</small>
              <span className="pk-card-foot">
                <span>{count(d, g)} {unit(g)}{settings.teams && !META[g].teams ? ' · butun sinf' : ''}</span>
                <span className="pk-stars" aria-label={`${best[g] ?? 0} yulduz`}>{[0, 1, 2].map((s) => <i key={s} className={s < (best[g] ?? 0) ? 'on' : ''}>★</i>)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const m = META[game];
  const common = { teams: teamsOn, sound: settings.sound, onFinish: finish, onProgress };

  return (
    <section className="pk playing" style={{ ...style, '--gc': m.color } as CSSProperties}>
      <div className="gbar">
        <button className="ghost" onClick={() => setGame(null)}>← O‘yinlar</button>
        <div className="gtitle"><span>{d.title || pack.topic}</span><strong>{m.icon} {m.name}</strong></div>
        <div className="gtools">
          {!result && <span className="pill">{game === 'pairs' ? 'Topildi: ' : game === 'order' ? 'Joylandi: ' : ''}{prog.at} / {prog.total}</span>}
          {teamsOn ? [0, 1].map((t) => (
            <span key={t} className={`pill team t${t + 1}${!result && prog.team === t ? ' active' : ''}`}>{t + 1}-jamoa: {prog.ts[t]}</span>
          )) : !result && game !== 'pairs' && game !== 'order' ? <span className="pill">To‘g‘ri: {prog.score}</span> : null}
          {tools}
        </div>
      </div>
      <div className="progress"><i style={{ width: `${result ? 100 : (prog.done / Math.max(1, prog.total)) * 100}%` }} /></div>

      {result ? (
        <Result o={result} name={m.name} onAgain={() => start(game)} onMenu={() => setGame(null)}
          next={games[games.indexOf(game) + 1]} onNext={(g) => start(g)} />
      ) : game === 'quiz' ? <QuizGame key={run} data={d.quiz} {...common} />
        : game === 'truefalse' ? <TrueFalseGame key={run} data={d.truefalse} {...common} />
          : game === 'pairs' ? <PairsGame key={run} data={d.pairs} {...common} />
            : game === 'sort' ? <SortGame key={run} data={d.sort} {...common} />
              : <OrderGame key={run} data={d.order} {...common} />}
    </section>
  );
}

function Result({ o, name, onAgain, onMenu, next, onNext }: {
  o: Outcome; name: string; onAgain: () => void; onMenu: () => void; next?: PackGameId; onNext: (g: PackGameId) => void;
}) {
  const n = starsOf(o);
  return (
    <div className="pk-board pk-result">
      {o.teams ? (
        <>
          <div className="pk-trophy pk-pop">🏆</div>
          <h2>{o.teams[0] > o.teams[1] ? '1-jamoa g‘olib!' : o.teams[1] > o.teams[0] ? '2-jamoa g‘olib!' : 'Durang! Ikkala jamoa ham zo‘r!'}</h2>
          <div className="teams-result">
            <div className="t1">1-jamoa<b>{o.teams[0]}</b></div>
            <div className="t2">2-jamoa<b>{o.teams[1]}</b></div>
          </div>
        </>
      ) : (
        <>
          <div className="pk-bigstars">{[0, 1, 2].map((k) => <span key={k} className={k < n ? 'on' : ''} style={{ '--k': k } as CSSProperties}>★</span>)}</div>
          <h2>{n === 3 ? 'Ajoyib! Barakalla!' : n === 2 ? 'Yaxshi natija!' : 'Yana bir bor urinib ko‘ramiz!'}</h2>
          <p>“{name}”: {o.total} tadan {o.score} ball</p>
        </>
      )}
      <div className="actions">
        {next && <button className="primary" autoFocus onClick={() => onNext(next)}>Keyingi o‘yin: {META[next].icon} {META[next].name} →</button>}
        <button className={next ? 'ghost' : 'primary'} onClick={onAgain}>↻ Yana o‘ynash</button>
        <button className="ghost" onClick={onMenu}>Barcha o‘yinlar</button>
      </div>
      {n === 3 && !o.teams && <div className="pk-confetti" aria-hidden="true">{Array.from({ length: 40 }, (_, k) => <i key={k} style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k % 10) * 0.15}s` }} />)}</div>}
    </div>
  );
}
