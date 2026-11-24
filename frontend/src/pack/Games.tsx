import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { shuffle } from '../games/util';
import { beep } from '../sound';
import type { PackData } from './types';

/** O'yin tugaganda: score/total (jamoa rejimida har jamoaning balli ham) */
export type Outcome = { score: number; total: number; teams?: [number, number] };
type Common = { teams: boolean; sound: boolean; onFinish: (o: Outcome) => void; onProgress: (p: Progress) => void };
/** done — tugaganlar (progress chizig'i uchun), at — hozirgi savol raqami (hisoblagich uchun) */
export type Progress = { done: number; at: number; total: number; score: number; team: number; ts: [number, number] };

const PRAISE = ['Barakalla!', 'Zo‘r!', 'Ofarin!', 'Qoyil!', 'Juda yaxshi!', 'To‘g‘ri!'];
const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
const LETTERS = ['A', 'B', 'C', 'D'];

/** Navbatma-navbat savollar uchun umumiy hisob (viktorina, to'g'ri/noto'g'ri, guruhlash) */
function useTurns(total: number, { teams, sound, onFinish, onProgress }: Common) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [ts, setTs] = useState<[number, number]>([0, 0]);
  const [answered, setAnswered] = useState<null | boolean>(null);
  const team = teams ? i % 2 : 0;

  useEffect(() => { onProgress({ done: i + (answered === null ? 0 : 1), at: i + 1, total, score, team, ts }); }, [i, answered, score, ts, total, team, onProgress]);

  const answer = (ok: boolean) => {
    if (answered !== null) return;
    setAnswered(ok);
    if (sound) beep(ok);
    if (ok) {
      setScore((s) => s + 1);
      setTs((t) => (team === 0 ? [t[0] + 1, t[1]] : [t[0], t[1] + 1]));
    }
  };
  const next = () => {
    if (answered === null) return;
    if (i + 1 >= total) {
      onFinish({ score, total, teams: teams ? ts : undefined });
      return;
    }
    setI(i + 1);
    setAnswered(null);
  };
  return { i, answered, answer, next, team };
}

function TurnTag({ teams, team }: { teams: boolean; team: number }) {
  if (!teams) return null;
  return <div className={`turn t${team + 1}`}>Navbat: {team + 1}-jamoa</div>;
}

function NextBtn({ onClick, last }: { onClick: () => void; last: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <button ref={ref} className="primary pk-next" onClick={onClick}>{last ? 'Natijani ko‘rish' : 'Keyingisi →'}</button>;
}

/* ---------------- 1. Viktorina ---------------- */

export function QuizGame({ data, ...c }: Common & { data: PackData['quiz'] }) {
  const items = useMemo(() => shuffle(data).map((q) => ({ ...q, options: shuffle(q.options) })), [data]);
  const t = useTurns(items.length, c);
  const q = items[t.i];
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [t.i]);

  const choose = (k: number) => {
    if (t.answered !== null) return;
    setPicked(k);
    t.answer(q.options[k] === q.answer);
  };
  useKeys((k) => {
    if (t.answered === null && /^[1-4]$/.test(k)) choose(Number(k) - 1);
    else if (t.answered !== null && (k === 'Enter' || k === ' ' || k === 'ArrowRight')) t.next();
  });

  return (
    <div className="pk-board" key={t.i}>
      <TurnTag teams={c.teams} team={t.team} />
      <div className="pk-emoji pk-pop">{q.emoji || '❓'}</div>
      <h2 className="pk-q">{q.question}</h2>
      <div className="pk-options">
        {q.options.map((o, k) => {
          const cls = t.answered === null ? '' : o === q.answer ? ' ok' : k === picked ? ' bad' : ' dim';
          return (
            <button key={o} className={'pk-opt' + cls} style={{ '--k': k } as CSSProperties} disabled={t.answered !== null} onClick={() => choose(k)}>
              <span className="pk-letter">{LETTERS[k]}</span>{o}
            </button>
          );
        })}
      </div>
      <Feedback ok={t.answered} right={q.answer} explain={q.explain} />
      {t.answered !== null && <NextBtn onClick={t.next} last={t.i + 1 >= items.length} />}
    </div>
  );
}

function Feedback({ ok, right, explain }: { ok: boolean | null; right?: string; explain?: string }) {
  const [p] = useState(praise);
  if (ok === null) return <div className="pk-feedback" />;
  return (
    <div className="pk-feedback pk-pop" aria-live="polite">
      {ok ? <b className="yes">{p}</b> : <><b className="no">Afsus.</b>{right && <> To‘g‘ri javob: <b>{right}</b></>}</>}
      {explain && <span>{explain}</span>}
    </div>
  );
}

/* ---------------- 2. To'g'ri yoki noto'g'ri ---------------- */

export function TrueFalseGame({ data, ...c }: Common & { data: PackData['truefalse'] }) {
  const items = useMemo(() => shuffle(data), [data]);
  const t = useTurns(items.length, c);
  const s = items[t.i];
  const choose = (v: boolean) => t.answer(v === s.isTrue);
  useKeys((k) => {
    if (t.answered === null && (k === '1' || k === 'ArrowLeft')) choose(true);
    else if (t.answered === null && (k === '2' || k === 'ArrowRight')) choose(false);
    else if (t.answered !== null && (k === 'Enter' || k === ' ' || k === 'ArrowRight')) t.next();
  });

  return (
    <div className="pk-board" key={t.i}>
      <TurnTag teams={c.teams} team={t.team} />
      <div className={'tf-card pk-pop' + (t.answered === null ? '' : s.isTrue ? ' is-true' : ' is-false')}>
        <span className="tf-emoji">{s.emoji || '🤔'}</span>
        <p>{s.statement}</p>
        {t.answered !== null && <span className="tf-stamp">{s.isTrue ? 'TO‘G‘RI' : 'NOTO‘G‘RI'}</span>}
      </div>
      <div className="tf-buttons">
        <button className="tf-btn yes" disabled={t.answered !== null} onClick={() => choose(true)}>✅ To‘g‘ri <kbd>1</kbd></button>
        <button className="tf-btn no" disabled={t.answered !== null} onClick={() => choose(false)}>❌ Noto‘g‘ri <kbd>2</kbd></button>
      </div>
      <Feedback ok={t.answered} explain={s.explain} />
      {t.answered !== null && <NextBtn onClick={t.next} last={t.i + 1 >= items.length} />}
    </div>
  );
}

/* ---------------- 3. Juftini top ---------------- */

const PAIR_COLORS = ['#2D5BE3', '#D9691A', '#1C8C4E', '#B8317F', '#7A4FD6', '#0E8C9A', '#C2453B', '#8A6D00'];

export function PairsGame({ data, sound, onFinish, onProgress }: Common & { data: PackData['pairs'] }) {
  const n = data.items.length;
  const left = useMemo(() => shuffle(data.items.map((p, k) => ({ k, text: p.left }))), [data]);
  const right = useMemo(() => shuffle(data.items.map((p, k) => ({ k, text: p.right }))), [data]);
  const [sel, setSel] = useState<{ side: 'l' | 'r'; k: number } | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const done = matched.length === n;
  const score = Math.max(0, n - mistakes);

  useEffect(() => { onProgress({ done: matched.length, at: matched.length, total: n, score: matched.length, team: 0, ts: [0, 0] }); }, [matched, n, onProgress]);

  const click = (side: 'l' | 'r', k: number) => {
    if (matched.includes(k) || wrong) return;
    if (!sel || sel.side === side) { setSel({ side, k }); return; }
    const l = side === 'l' ? k : sel.k;
    const r = side === 'r' ? k : sel.k;
    setSel(null);
    if (l === r) {
      setMatched((m) => [...m, k]);
      if (sound) beep(true);
    } else {
      setMistakes((x) => x + 1);
      setWrong({ l, r });
      if (sound) beep(false);
      setTimeout(() => setWrong(null), 700);
    }
  };
  const color = (k: number) => PAIR_COLORS[matched.indexOf(k) % PAIR_COLORS.length];
  const cls = (side: 'l' | 'r', k: number) => {
    if (matched.includes(k)) return ' matched';
    if (wrong && (side === 'l' ? wrong.l : wrong.r) === k) return ' wrong';
    if (sel && sel.side === side && sel.k === k) return ' selected';
    return '';
  };

  return (
    <div className="pk-board">
      <h2 className="pk-q small">{data.title || 'Juftini toping'}</h2>
      <div className="pairs">
        {[left, right].map((col, c) => (
          <div key={c} className="pair-col">
            {col.map((it) => {
              const side = c ? 'r' : 'l';
              return (
                <button key={it.k} className={'pair-card' + (onlyEmoji(it.text) ? ' emo' : '') + cls(side, it.k)} disabled={matched.includes(it.k)}
                  style={matched.includes(it.k) ? ({ '--pc': color(it.k) } as CSSProperties) : undefined}
                  onClick={() => click(side, it.k)}>
                  {it.text}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="pk-feedback">
        {done ? <b className="yes">Hammasi topildi! {mistakes === 0 ? 'Birorta ham xatosiz!' : `Xatolar: ${mistakes}`}</b>
          : <span>Avval chapdan, keyin o‘ngdan mos kartani bosing · topildi: {matched.length} / {n}</span>}
      </div>
      {done && <NextBtn onClick={() => onFinish({ score, total: n })} last />}
    </div>
  );
}

/* ---------------- 4. Guruhlarga ajrat ---------------- */

export function SortGame({ data, ...c }: Common & { data: PackData['sort'] }) {
  const items = useMemo(() => shuffle(data.items), [data]);
  const t = useTurns(items.length, c);
  const it = items[t.i];
  const [bins, setBins] = useState<[string[], string[]]>([[], []]);
  const [chosen, setChosen] = useState<number | null>(null);

  const put = (g: number) => {
    if (t.answered !== null) return;
    setChosen(g);
    t.answer(g === it.group);
    setBins((b) => {
      const nb: [string[], string[]] = [[...b[0]], [...b[1]]];
      nb[it.group].push(it.text);
      return nb;
    });
  };
  // To'g'ri bo'lsa o'zi keyingisiga o'tadi; xato bo'lsa bolalar to'g'ri guruhni ko'rib olishi uchun kutadi
  useEffect(() => {
    if (t.answered !== true) return;
    const id = setTimeout(() => { setChosen(null); t.next(); }, 1100);
    return () => clearTimeout(id);
  }, [t.answered, t.i]);
  useKeys((k) => {
    if (t.answered === null && (k === 'ArrowLeft' || k === '1')) put(0);
    else if (t.answered === null && (k === 'ArrowRight' || k === '2')) put(1);
    else if (t.answered === false && (k === 'Enter' || k === ' ')) { setChosen(null); t.next(); }
  });

  return (
    <div className="pk-board">
      <TurnTag teams={c.teams} team={t.team} />
      <h2 className="pk-q small">{data.title || 'Guruhlarga ajrating'}</h2>
      <div className="sort-area">
        {data.groups.map((g, k) => (
          <button key={k} className={'bin b' + k + (t.answered !== null && it.group === k ? ' target' : '') + (chosen === k && t.answered === false ? ' wrong' : '')}
            disabled={t.answered !== null} onClick={() => put(k)}>
            <span className="bin-head"><span className="bin-emoji">{g.emoji}</span>{g.name}<kbd>{k ? '→' : '←'}</kbd></span>
            <span className="bin-items">{bins[k].map((x, j) => <span key={j} className="chip-in">{x}</span>)}</span>
          </button>
        ))}
        <div key={t.i} className={'sort-card pk-pop' + (t.answered === null ? '' : t.answered ? ' ok' : ' bad')}>{it.text}</div>
      </div>
      <div className="pk-feedback">
        {t.answered === null ? <span>Qaysi guruhga kiradi? Guruhni bosing yoki ← → · {t.i + 1} / {items.length}</span>
          : t.answered ? <b className="yes">{praise()}</b>
            : <><b className="no">Afsus.</b> Bu “{data.groups[it.group]?.name}” guruhiga kiradi.</>}
      </div>
      {t.answered === false && <NextBtn onClick={() => { setChosen(null); t.next(); }} last={t.i + 1 >= items.length} />}
    </div>
  );
}

/* ---------------- 5. Tartibga sol ---------------- */

export function OrderGame({ data, sound, onFinish, onProgress }: Common & { data: PackData['order'] }) {
  const totalSteps = data.reduce((s, o) => s + o.steps.length, 0);
  const [task, setTask] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [doneSteps, setDoneSteps] = useState(0);
  const cur = data[task];
  const pool = useMemo(() => {
    // Aralashtirilgan tartib to'g'ri tartib bilan bir xil chiqmasin
    let s = shuffle(cur.steps.map((text, k) => ({ text, k })));
    for (let g = 0; g < 5 && s.every((x, j) => x.k === j); g++) s = shuffle(s);
    return s;
  }, [cur]);
  const finished = placed === cur.steps.length;

  useEffect(() => { onProgress({ done: doneSteps + placed, at: doneSteps + placed, total: totalSteps, score: doneSteps + placed, team: 0, ts: [0, 0] }); }, [placed, doneSteps, totalSteps, onProgress]);

  const click = (k: number) => {
    if (finished || k < placed || wrong !== null) return;
    if (k === placed) {
      setPlaced(placed + 1);
      if (sound) beep(true);
    } else {
      setMistakes((m) => m + 1);
      setWrong(k);
      if (sound) beep(false);
      setTimeout(() => setWrong(null), 650);
    }
  };
  const nextTask = () => {
    if (task + 1 >= data.length) {
      onFinish({ score: Math.max(0, totalSteps - mistakes), total: totalSteps });
      return;
    }
    setDoneSteps(doneSteps + cur.steps.length);
    setTask(task + 1);
    setPlaced(0);
  };

  return (
    <div className="pk-board" key={task}>
      <h2 className="pk-q small">{cur.title}</h2>
      {data.length > 1 && <div className="pill">{task + 1}-topshiriq / {data.length}</div>}
      <ol className="order-slots">
        {cur.steps.map((s, j) => (
          <li key={j} className={j < placed ? 'filled pk-pop' : j === placed ? 'next' : ''}>
            <span className="slot-n">{j + 1}</span>{j < placed ? s : ''}
          </li>
        ))}
      </ol>
      <div className="order-pool">
        {pool.map((p) => (
          <button key={p.k} className={'order-chip' + (p.k < placed ? ' used' : '') + (wrong === p.k ? ' wrong' : '')}
            disabled={p.k < placed || finished} onClick={() => click(p.k)}>
            {p.text}
          </button>
        ))}
      </div>
      <div className="pk-feedback">
        {finished ? <b className="yes">{praise()} Tartib to‘g‘ri!</b> : <span>{placed + 1}-o‘rinda nima turadi? Bosing.</span>}
      </div>
      {finished && <NextBtn onClick={nextTask} last={task + 1 >= data.length} />}
    </div>
  );
}

/* ---------------- yordamchi ---------------- */

/** Faqat emoji bo'lsa (harf/raqamsiz), kartada kattaroq ko'rsatamiz */
const onlyEmoji = (t: string) => !/[\p{L}\p{N}]/u.test(t) && /\p{Extended_Pictographic}/u.test(t);

function useKeys(handler: (key: string) => void) {
  const h = useRef(handler);
  h.current = handler;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      // Probel/Enter fokusdagi tugmani ham bosadi; ikki marta ishlamasligi uchun o'zimiz boshqaramiz
      if (e.key === ' ' || e.key === 'Enter' || e.key.startsWith('Arrow')) e.preventDefault();
      h.current(e.key);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
}
