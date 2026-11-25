import { useEffect, useMemo, useState } from 'react';
import { shuffle } from '../games/util';
import { sfx } from './audio';
import { COINS_PER_STAR } from './shop';
import type { Mission, Task } from './types';

/** Missiyani o'tish uchun kerakli to'g'ri javoblar ulushi */
export const PASS = 0.6;

/** Qidiruv topshirig'i holati (faqat missiya birinchi marta o'ynalganda) */
export type QuestInfo = { e: string; name: string; got: number; total: number; started: boolean };

type Props = {
  mission: Mission;
  index: number;
  hero: string;       // qahramon ismi
  best: number;       // oldingi eng yaxshi yulduzlar
  doneBefore: boolean;
  quest: QuestInfo | null;
  onQuest: () => void;
  onClose: () => void;
  onFinish: (stars: number, passed: boolean, coins: number) => void;
};

/** Ichki turlar: "balloon" — tanlov savoli uchib yuruvchi sharlar ko'rinishida */
type View = Task | (Omit<Task, 'kind'> & { kind: 'balloon' });

function prepare(tasks: Task[]): View[] {
  let balloon = false;
  return tasks.map((t): View => {
    if (t.kind !== 'choice') return t;
    const opts = shuffle(t.options);
    // Bitta qisqa javobli savolni sharlar o'yiniga aylantiramiz (har safar boshqa tartibda)
    if (!balloon && opts.every((o) => o.length <= 26) && Math.random() < 0.75) {
      balloon = true;
      return { ...t, kind: 'balloon', options: opts };
    }
    return { ...t, options: opts };
  });
}

/** Qahramon bilan suhbat → (qidiruv) → topshiriqlar → natija va mukofot */
export default function MissionDialog({ mission, index, hero, best, doneBefore: doneProp, quest, onQuest, onClose, onFinish }: Props) {
  // Ochilgan paytdagi holat: natija saqlangach prop o'zgarsa ham matn to'g'ri qoladi
  const [doneBefore] = useState(doneProp);
  const [bestBefore] = useState(best);
  const [stage, setStage] = useState<'intro' | 'task' | 'result'>('intro');
  const [run, setRun] = useState(0);
  const tasks = useMemo(() => prepare(mission.tasks), [mission, run]);
  const [i, setI] = useState(0);
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState<null | boolean>(null);
  const [gain, setGain] = useState(0);
  const total = tasks.length;
  const need = Math.ceil(total * PASS);
  const passed = stars >= need;
  const questOpen = !!quest && quest.got < quest.total;

  useEffect(() => { sfx.talk(); }, []);

  const answer = (ok: boolean) => {
    if (answered !== null) return;
    setAnswered(ok);
    if (ok) { setStars((s) => s + 1); setStreak((s) => s + 1); sfx.ok(); } else { setStreak(0); sfx.bad(); }
  };
  const next = () => {
    if (i + 1 >= total) {
      setStage('result');
      const ok = stars >= need;
      const coins = Math.max(0, stars - bestBefore) * COINS_PER_STAR;
      setGain(coins);
      onFinish(stars, ok, coins);
      for (let k = 0; k < stars; k++) setTimeout(() => sfx.star(k), 200 + k * 160);
      if (ok) setTimeout(() => sfx.fanfare(), 260 + stars * 160);
      return;
    }
    setI(i + 1);
    setAnswered(null);
  };
  const restart = () => { setRun((r) => r + 1); setI(0); setStars(0); setStreak(0); setAnswered(null); setStage('task'); };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'Enter' || e.key === ' ') && stage === 'task' && answered !== null) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const t = tasks[i];

  return (
    <div className="adv-modal" role="dialog" aria-modal="true" aria-label={mission.title}>
      <div className="adv-card">
        <div className="adv-card-head">
          <span className="adv-npc">{mission.npcEmoji}</span>
          <div>
            <small>{index + 1}-missiya · {mission.topic}</small>
            <b>{mission.title}</b>
          </div>
          <button className="adv-x" onClick={onClose} aria-label="Yopish">✕</button>
        </div>

        {stage === 'intro' && (
          <div className="adv-body">
            {quest && quest.started && questOpen ? (
              <>
                <div className="adv-speech"><b>{mission.npcName}:</b> Hali {quest.got} tasini topding, {hero}. Yana {quest.total - quest.got} ta {quest.e} {quest.name} qoldi. Atrofni yaxshilab qidir!</div>
                <div className="adv-quest-dots">{Array.from({ length: quest.total }, (_, k) => <span key={k} className={k < quest.got ? 'on' : ''}>{quest.e}</span>)}</div>
                <div className="adv-actions"><button className="primary big" autoFocus onClick={onClose}>Qidirishni davom etaman 🔍</button></div>
              </>
            ) : quest && !quest.started ? (
              <>
                <div className="adv-speech"><b>{mission.npcName}:</b> Salom, {hero}! {mission.story}</div>
                <div className="adv-speech adv-quest-ask">Lekin avval bitta iltimos: men <b>{quest.total} ta {quest.e} {quest.name}ni</b> yo‘qotib qo‘ydim. Ular shu atrofda. Topib kelasanmi?</div>
                <div className="adv-quest-dots">{Array.from({ length: quest.total }, (_, k) => <span key={k}>{quest.e}</span>)}</div>
                <div className="adv-actions">
                  <button className="primary big" autoFocus onClick={() => { onQuest(); onClose(); }}>Qidirib topaman! 🔍</button>
                  <button className="ghost" onClick={onClose}>Keyinroq</button>
                </div>
              </>
            ) : (
              <>
                <div className="adv-speech">
                  <b>{mission.npcName}:</b>{' '}
                  {quest ? `Rahmat, ${hero}! Hammasini topibsan ${quest.e.repeat(quest.total)}. Endi asosiy yordam kerak: ` : `Salom, ${hero}! `}
                  {quest ? 'savollarimga javob berib, muammoni hal qilamiz!' : mission.story}
                </div>
                {doneBefore && <p className="adv-note">Siz bu missiyani bajargansiz: {'⭐'.repeat(best)}{'☆'.repeat(Math.max(0, total - best))}. Yana o‘ynab, ko‘proq yulduz yig‘ishingiz mumkin.</p>}
                <div className="adv-reward-preview">Mukofot: <span>{mission.rewardEmoji}</span> {mission.rewardName} · har yulduz uchun +{COINS_PER_STAR} 🪙</div>
                <div className="adv-actions">
                  <button className="primary big" autoFocus onClick={() => setStage('task')}>{doneBefore ? 'Yana o‘ynash' : 'Yordam beraman! 💪'}</button>
                  <button className="ghost" onClick={onClose}>Keyinroq</button>
                </div>
              </>
            )}
          </div>
        )}

        {stage === 'task' && (
          <div className="adv-body" key={run + '-' + i}>
            <div className="adv-progress">
              {tasks.map((_, k) => <i key={k} className={k < i ? 'past' : k === i ? 'now' : ''} />)}
              <span>⭐ {stars}</span>
              {streak >= 2 && <span className="adv-streak" key={streak}>🔥 {streak}</span>}
            </div>
            {t.kind === 'order' ? <OrderTask task={t} answered={answered} onAnswer={answer} />
              : t.kind === 'match' ? <MatchTask task={t} answered={answered} onAnswer={answer} />
              : t.kind === 'balloon' ? <BalloonTask task={t} answered={answered} onAnswer={answer} />
              : <ChoiceTask task={t} answered={answered} onAnswer={answer} />}
            {answered !== null && (
              <div className={'adv-feedback ' + (answered ? 'ok' : 'bad')}>
                <b>{answered ? (streak >= 3 ? `Zo‘r! ${streak} ta ketma-ket! 🔥` : 'To‘g‘ri! ⭐') : 'Afsus.'}</b> {t.explain}
              </div>
            )}
            {answered && <Burst key={'b' + i} />}
            {answered !== null && <button className="primary" autoFocus onClick={next}>{i + 1 >= total ? 'Natija' : 'Keyingisi →'}</button>}
          </div>
        )}

        {stage === 'result' && (
          <div className="adv-body adv-result">
            <div className="adv-stars">{Array.from({ length: total }, (_, k) => <span key={k} className={k < stars ? 'on' : ''} style={{ animationDelay: `${0.2 + k * 0.16}s` }}>★</span>)}</div>
            {gain > 0 && <div className="adv-gain">+{gain} 🪙 <small>tanga oldingiz</small></div>}
            {passed ? (
              <>
                <div className="adv-speech"><b>{mission.npcName}:</b> {mission.success} Barakalla, {hero}!</div>
                <div className="adv-reward"><span>{mission.rewardEmoji}</span><div><small>Siz oldingiz:</small><b>{mission.rewardName}</b></div></div>
                {!doneBefore && <p className="adv-note">🔓 Yangi darvoza ochildi! Yo‘lda davom eting.</p>}
                <div className="adv-actions"><button className="primary big" autoFocus onClick={onClose}>Davom etish →</button></div>
                <Burst big />
              </>
            ) : (
              <>
                <h3>Ozgina qoldi!</h3>
                <p className="adv-note">{total} tadan {stars} ta to‘g‘ri. Missiyani o‘tish uchun kamida {need} ta kerak.</p>
                <div className="adv-actions">
                  <button className="primary big" autoFocus onClick={restart}>↻ Yana urinib ko‘rish</button>
                  <button className="ghost" onClick={onClose}>Keyinroq</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** To'g'ri javobda yulduzcha va konfetti portlashi */
function Burst({ big }: { big?: boolean }) {
  const n = big ? 28 : 14;
  return (
    <div className={'adv-burst' + (big ? ' big' : '')} aria-hidden="true">
      {Array.from({ length: n }, (_, k) => (
        <i key={k} style={{ '--a': `${(k / n) * 360}deg`, '--d': `${big ? 160 + (k % 4) * 40 : 90 + (k % 3) * 30}px`, animationDelay: `${(k % 5) * 0.03}s` } as React.CSSProperties}>
          {['⭐', '✨', '🎉', '💛'][k % 4]}
        </i>
      ))}
    </div>
  );
}

type TaskProps<T> = { task: T; answered: boolean | null; onAnswer: (ok: boolean) => void };

function ChoiceTask({ task, answered, onAnswer }: TaskProps<Task>) {
  const [picked, setPicked] = useState<string | null>(null);
  const choose = (o: string) => {
    if (answered !== null) return;
    setPicked(o);
    onAnswer(o === task.answer);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (answered === null && n >= 1 && n <= task.options.length) choose(task.options[n - 1]);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });
  const tf = task.kind === 'truefalse';
  return (
    <>
      <h3 className="adv-q">{tf ? '🤔 To‘g‘rimi yoki noto‘g‘ri?' : ''}{tf && <br />}{task.question}</h3>
      <div className={'adv-opts' + (tf ? ' tf' : '')}>
        {task.options.map((o, k) => {
          const cls = answered === null ? '' : o === task.answer ? ' ok' : o === picked ? ' bad' : ' dim';
          return (
            <button key={o} className={'adv-opt' + cls} disabled={answered !== null} onClick={() => choose(o)}>
              <kbd>{k + 1}</kbd>{tf ? (k === 0 ? '✅ ' : '❌ ') : ''}{o}
            </button>
          );
        })}
      </div>
    </>
  );
}

const BALLOON_COLORS = ['#EF4444', '#3B82F6', '#F59E0B', '#22C55E', '#A855F7'];

/** Sharlar o'yini: javoblar yozilgan sharlar suzib yuradi, to'g'risini bosib yorish kerak */
function BalloonTask({ task, answered, onAnswer }: TaskProps<View>) {
  const [popped, setPopped] = useState<string | null>(null);
  const pop = (o: string) => {
    if (answered !== null) return;
    setPopped(o);
    sfx.pop();
    onAnswer(o === task.answer);
  };
  return (
    <>
      <h3 className="adv-q">🎈 To‘g‘ri javob yozilgan sharni yoring!<br />{task.question}</h3>
      <div className="adv-sky">
        {task.options.map((o, k) => {
          const state = answered === null ? '' : o === popped ? (o === task.answer ? ' pop' : ' pop bad') : o === task.answer ? ' right' : ' away';
          return (
            <button
              key={o} className={'adv-balloon' + state} disabled={answered !== null} onClick={() => pop(o)}
              aria-label={o}
              style={{ '--c': BALLOON_COLORS[k % BALLOON_COLORS.length], '--t': `${8.5 + (k % 3) * 1.4}s`, left: `${4 + k * (92 / task.options.length)}%`, animationDelay: `${-((k * 2.7) % 8)}s` } as React.CSSProperties}
            >
              <span>{o}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Juftini topish: chapdagini, keyin unga mos o'ngdagini bosish. Ko'pi bilan 1 xato bilan o'tadi */
function MatchTask({ task, answered, onAnswer }: TaskProps<Task>) {
  const pairs = useMemo(() => task.options.map((s) => { const j = s.indexOf('|'); return { a: s.slice(0, j).trim(), b: s.slice(j + 1).trim() }; }), [task]);
  const right = useMemo(() => shuffle(pairs.map((_, k) => k)), [pairs]);
  const [sel, setSel] = useState<number | null>(null);
  const [ok, setOk] = useState<number[]>([]);
  const [bad, setBad] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const pickB = (k: number) => {
    if (answered !== null || sel === null || ok.includes(k)) return;
    if (k === sel) {
      const n = [...ok, k];
      setOk(n); setSel(null); sfx.coin();
      if (n.length === pairs.length) onAnswer(mistakes <= 1);
    } else {
      const m = mistakes + 1;
      setMistakes(m); setBad(k); sfx.bad();
      setTimeout(() => setBad(null), 450);
      if (m > 2) { setOk(pairs.map((_, j) => j)); onAnswer(false); }
    }
  };
  return (
    <>
      <h3 className="adv-q">🧩 {task.question}</h3>
      <p className="adv-note">Chapdagini bosing, keyin unga mos keladiganini o‘ngdan tanlang.{mistakes > 0 && answered === null && ` Xatolar: ${mistakes}`}</p>
      <div className="adv-match">
        <div>
          {pairs.map((p, k) => (
            <button key={k} className={'adv-mcell' + (ok.includes(k) ? ' ok' : sel === k ? ' sel' : '')} disabled={answered !== null || ok.includes(k)} onClick={() => setSel(k)}>{p.a}</button>
          ))}
        </div>
        <div>
          {right.map((k) => (
            <button key={k} className={'adv-mcell' + (ok.includes(k) ? ' ok' : bad === k ? ' bad' : '')} disabled={answered !== null || ok.includes(k) || sel === null} onClick={() => pickB(k)}>{pairs[k].b}</button>
          ))}
        </div>
      </div>
    </>
  );
}

/** Tartib topshirig'i: elementlarni to'g'ri ketma-ketlikda bosish; birinchi xatoda javob ko'rsatiladi */
function OrderTask({ task, answered, onAnswer }: TaskProps<Task>) {
  const pool = useMemo(() => {
    let s = shuffle(task.options.map((text, k) => ({ text, k })));
    for (let g = 0; g < 5 && s.every((x, j) => x.k === j); g++) s = shuffle(s);
    return s;
  }, [task]);
  const [placed, setPlaced] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const click = (k: number) => {
    if (answered !== null || k < placed) return;
    if (k === placed) {
      const n = placed + 1;
      setPlaced(n);
      if (n === task.options.length) onAnswer(true); else sfx.coin();
    } else {
      setWrong(k);
      setPlaced(task.options.length);
      onAnswer(false);
    }
  };
  return (
    <>
      <h3 className="adv-q">🪜 {task.question}</h3>
      <ol className="adv-slots">
        {task.options.map((s, j) => (
          <li key={j} className={j < placed ? (answered === false ? 'shown' : 'filled') : j === placed ? 'next' : ''}>
            <span>{j + 1}</span>{j < placed ? s : ''}
          </li>
        ))}
      </ol>
      {answered === null && (
        <div className="adv-chips">
          {pool.filter((p) => p.k >= placed).map((p) => (
            <button key={p.k} className={'adv-chip' + (wrong === p.k ? ' bad' : '')} onClick={() => click(p.k)}>{p.text}</button>
          ))}
        </div>
      )}
    </>
  );
}
