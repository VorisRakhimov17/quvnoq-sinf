import { useEffect, useMemo, useState } from 'react';
import { shuffle } from '../games/util';
import { beep } from '../sound';
import type { Mission, Task } from './types';

/** Missiyani o'tish uchun kerakli to'g'ri javoblar ulushi */
export const PASS = 0.6;

type Props = {
  mission: Mission;
  index: number;
  best: number;       // oldingi eng yaxshi yulduzlar
  doneBefore: boolean;
  sound: boolean;
  onClose: () => void;
  onFinish: (stars: number, passed: boolean) => void;
};

/** Qahramon bilan suhbat → topshiriqlar → natija va mukofot */
export default function MissionDialog({ mission, index, best, doneBefore: doneProp, sound, onClose, onFinish }: Props) {
  // Ochilgan paytdagi holat: natija saqlangach prop o'zgarsa ham matn to'g'ri qoladi
  const [doneBefore] = useState(doneProp);
  const [stage, setStage] = useState<'intro' | 'task' | 'result'>('intro');
  const [run, setRun] = useState(0);
  const tasks = useMemo(() => mission.tasks.map((t) => (t.kind === 'choice' ? { ...t, options: shuffle(t.options) } : t)), [mission, run]);
  const [i, setI] = useState(0);
  const [stars, setStars] = useState(0);
  const [answered, setAnswered] = useState<null | boolean>(null);
  const total = tasks.length;
  const passed = stars >= Math.ceil(total * PASS);

  const answer = (ok: boolean) => {
    if (answered !== null) return;
    setAnswered(ok);
    if (ok) setStars((s) => s + 1);
    if (sound) beep(ok);
  };
  const next = () => {
    if (i + 1 >= total) {
      setStage('result');
      const s = stars;
      onFinish(s, s >= Math.ceil(total * PASS));
      if (sound && s >= Math.ceil(total * PASS)) setTimeout(() => beep(true), 250);
      return;
    }
    setI(i + 1);
    setAnswered(null);
  };
  const restart = () => { setRun((r) => r + 1); setI(0); setStars(0); setAnswered(null); setStage('task'); };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'Enter' || e.key === ' ') && stage === 'task' && answered !== null) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

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
            <div className="adv-speech"><b>{mission.npcName}:</b> {mission.story}</div>
            {doneBefore && <p className="adv-note">Siz bu missiyani bajargansiz: {'⭐'.repeat(best)}{'☆'.repeat(Math.max(0, total - best))}. Yana o‘ynab, ko‘proq yulduz yig‘ishingiz mumkin.</p>}
            <div className="adv-reward-preview">Mukofot: <span>{mission.rewardEmoji}</span> {mission.rewardName}</div>
            <div className="adv-actions">
              <button className="primary big" autoFocus onClick={() => setStage('task')}>{doneBefore ? 'Yana o‘ynash' : 'Yordam beraman! 💪'}</button>
              <button className="ghost" onClick={onClose}>Keyinroq</button>
            </div>
          </div>
        )}

        {stage === 'task' && (
          <div className="adv-body" key={run + '-' + i}>
            <div className="adv-progress">
              {tasks.map((_, k) => <i key={k} className={k < i ? 'past' : k === i ? 'now' : ''} />)}
              <span>⭐ {stars}</span>
            </div>
            <TaskView task={tasks[i]} answered={answered} onAnswer={answer} />
            {answered !== null && (
              <div className={'adv-feedback ' + (answered ? 'ok' : 'bad')}>
                <b>{answered ? 'To‘g‘ri! ⭐' : 'Afsus.'}</b> {tasks[i].explain}
              </div>
            )}
            {answered !== null && <button className="primary" autoFocus onClick={next}>{i + 1 >= total ? 'Natija' : 'Keyingisi →'}</button>}
          </div>
        )}

        {stage === 'result' && (
          <div className="adv-body adv-result">
            <div className="adv-stars">{Array.from({ length: total }, (_, k) => <span key={k} className={k < stars ? 'on' : ''} style={{ animationDelay: `${k * 0.15}s` }}>★</span>)}</div>
            {passed ? (
              <>
                <div className="adv-speech"><b>{mission.npcName}:</b> {mission.success}</div>
                <div className="adv-reward"><span>{mission.rewardEmoji}</span><div><small>Siz oldingiz:</small><b>{mission.rewardName}</b></div></div>
                {!doneBefore && <p className="adv-note">🔓 Yangi darvoza ochildi! Yo‘lda davom eting.</p>}
                <div className="adv-actions"><button className="primary big" autoFocus onClick={onClose}>Davom etish →</button></div>
              </>
            ) : (
              <>
                <h3>Ozgina qoldi!</h3>
                <p className="adv-note">{total} tadan {stars} ta to‘g‘ri. Missiyani o‘tish uchun kamida {Math.ceil(total * PASS)} ta kerak.</p>
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

function TaskView({ task, answered, onAnswer }: { task: Task; answered: boolean | null; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (task.kind === 'order') return;
    const on = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (answered === null && n >= 1 && n <= task.options.length) choose(task.options[n - 1]);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const choose = (o: string) => {
    if (answered !== null) return;
    setPicked(o);
    onAnswer(o === task.answer);
  };

  if (task.kind === 'order') return <OrderTask task={task} answered={answered} onAnswer={onAnswer} />;
  return (
    <>
      <h3 className="adv-q">{task.kind === 'truefalse' ? '🤔 To‘g‘rimi yoki noto‘g‘ri?' : ''}{task.kind === 'truefalse' && <br />}{task.question}</h3>
      <div className={'adv-opts' + (task.kind === 'truefalse' ? ' tf' : '')}>
        {task.options.map((o, k) => {
          const cls = answered === null ? '' : o === task.answer ? ' ok' : o === picked ? ' bad' : ' dim';
          return (
            <button key={o} className={'adv-opt' + cls} disabled={answered !== null} onClick={() => choose(o)}>
              <kbd>{k + 1}</kbd>{task.kind === 'truefalse' ? (k === 0 ? '✅ ' : '❌ ') : ''}{o}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Tartib topshirig'i: elementlarni to'g'ri ketma-ketlikda bosish; birinchi xatoda javob ko'rsatiladi */
function OrderTask({ task, answered, onAnswer }: { task: Task; answered: boolean | null; onAnswer: (ok: boolean) => void }) {
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
      if (n === task.options.length) onAnswer(true);
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
