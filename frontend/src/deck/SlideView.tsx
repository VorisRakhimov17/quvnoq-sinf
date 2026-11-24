import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { beep } from '../sound';
import Art from './Art';
import Motif from './Motif';
import { hash } from './theme';
import type { Deck, Slide } from './types';

/** Slayddagi bosqichlar soni: "keyingi" tugmasi avval shularni ochadi, keyin keyingi slaydga o'tadi */
export function stepsOf(s: Slide) {
  if (s.type === 'example') return s.steps.length + (s.result ? 1 : 0);
  if (s.type === 'hook' || s.type === 'quiz') return 1;
  return 0;
}

type Props = {
  deck: Deck;
  slide: Slide;
  index: number;
  step: number;
  picked: number | null;
  onPick?: (i: number) => void;
  thumb?: boolean;
};

const LETTERS = ['A', 'B', 'C', 'D'];

/** Bo'sh sarlavha chiqmasin; "1. Yozamiz" kabi raqamni olib tashlaymiz (raqam alohida doirada) */
const Title = ({ text }: { text: string }) => (text ? <h2 className="title in" style={d(0)}>{text}</h2> : null);
const noNum = (t: string) => t.replace(/^\s*\d+\s*[.)\-–:]\s*/, '');

/** Elementlar ketma-ket chiqishi uchun kechikish */
const d = (i: number): CSSProperties => ({ '--i': i } as CSSProperties);

export default function SlideView({ deck, slide, index, step, picked, onPick, thumb }: Props) {
  const seed = hash(deck.title + index + slide.type);
  const variant = seed % 3;
  const t = deck.theme;
  const full = slide.type === 'cover' || slide.type === 'ending';

  return (
    <div className={`slide s-${slide.type} v${variant} shape-${t.shape}`} data-thumb={thumb || undefined}>
      <Motif kind={t.motif} seed={seed} dense={full} />
      <div className="slide-body">{body(deck, slide, variant, step, picked, onPick, thumb)}</div>
      {!full && (
        <div className="mascot-badge" style={d(9)}>
          <span>{deck.mascot.emoji}</span>
          <small>{deck.mascot.name}</small>
        </div>
      )}
      <div className="slide-no">{index + 1}</div>
    </div>
  );
}

function Highlight({ text, mark }: { text: string; mark: string }) {
  if (!mark) return <>{text}</>;
  const i = text.indexOf(mark);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{mark}</mark>{text.slice(i + mark.length)}</>;
}

function body(deck: Deck, s: Slide, v: number, step: number, picked: number | null, onPick?: (i: number) => void, thumb?: boolean): ReactNode {
  switch (s.type) {
    case 'cover':
      return (
        <div className="cover">
          <div className="cover-text">
            <span className="kicker in" style={d(0)}>{deck.theme.styleName}</span>
            <h1 className="in" style={d(1)}>{s.title}</h1>
            {s.subtitle && <p className="in" style={d(2)}>{s.subtitle}</p>}
            <div className="cover-mascot in" style={d(3)}>
              <span>{deck.mascot.emoji}</span>
              <div><b>{deck.mascot.name}</b><small>{deck.mascot.role}</small></div>
            </div>
          </div>
          <Art svg={s.art} emoji={s.emoji} className="cover-art in pop" />
        </div>
      );

    case 'hook':
      return (
        <div className="hook">
          <div className="hook-emoji in wobble" style={d(0)}>{s.emoji || '❓'}</div>
          <h2 className="in" style={d(1)}>{s.question}</h2>
          {step >= 1 && !thumb
            ? <div className="reveal-card pop-in">💡 {s.reveal}</div>
            : <div className="hint in" style={d(2)}>Qani, kim topadi? <kbd>→</kbd></div>}
        </div>
      );

    case 'story':
      return (
        <div className="story">
          <Title text={s.title} />
          <div className="story-row">
            <div className="bubbles">
              {s.lines.map((l, i) => (
                <div key={i} className={'bubble in ' + (i % 2 ? 'right' : 'left')} style={d(i + 1)}>
                  <span className="avatar">{l.emoji || deck.mascot.emoji}</span>
                  <div><b>{l.who}</b><p>{l.text}</p></div>
                </div>
              ))}
            </div>
            {s.art && <Art svg={s.art} className="side-art in" />}
          </div>
        </div>
      );

    case 'bigIdea':
      return (
        <div className={'big-idea' + (s.art ? ' with-art' : '')}>
          <div>
            <div className="big-emoji in" style={d(0)}>{s.emoji}</div>
            <p className="big-text in" style={d(1)}><Highlight text={s.text} mark={s.highlight} /></p>
          </div>
          {s.art && <Art svg={s.art} className="side-art in" />}
        </div>
      );

    case 'explain': {
      const cards = !s.art || v === 2;
      return (
        <div className={'explain' + (cards ? ' as-cards' : '')}>
          <Title text={s.title} />
          <div className="explain-row">
            <ul className="points">
              {s.points.map((p, i) => (
                <li key={i} className="in" style={d(i + 1)}><span className="pe">{p.emoji}</span><span>{p.text}</span></li>
              ))}
            </ul>
            {!cards && <Art svg={s.art} className="side-art in" />}
          </div>
        </div>
      );
    }

    case 'steps':
      return (
        <div className={'steps' + (v === 1 || s.steps.length > 4 ? ' vertical' : '')}>
          <Title text={s.title} />
          <ol>
            {s.steps.map((p, i) => (
              <li key={i} className="in" style={d(i + 1)}>
                <span className="num">{i + 1}</span>
                <div><b>{noNum(p.title)}</b>{p.text && <p>{p.text}</p>}</div>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'example': {
      const shown = thumb ? s.steps.length : Math.min(step, s.steps.length);
      const done = thumb || (s.result && step > s.steps.length);
      return (
        <div className={'example' + (s.steps.length > 4 ? ' many' : '')}>
          <Title text={s.title} />
          <div className="problem in" style={d(1)}>{s.problem}</div>
          <ol className="work">
            {s.steps.slice(0, shown).map((x, i) => <li key={i} className="pop-in"><span className="num">{i + 1}</span>{noNum(x)}</li>)}
          </ol>
          {done && s.result ? <div className={'result pop-in' + (s.result.length > 22 ? ' long' : '')}>✅ {s.result}</div>
            : <div className="hint">Keyingi qadam <kbd>→</kbd></div>}
        </div>
      );
    }

    case 'compare':
      return (
        <div className="compare">
          <Title text={s.title} />
          <div className="sides">
            {[s.left, s.right].map((side, k) => (
              <div key={k} className={'side in ' + (k ? 'b' : 'a')} style={d(k + 1)}>
                <div className="side-head"><span>{side.emoji}</span><b>{side.title}</b></div>
                <ul>{side.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
              </div>
            ))}
            <div className="vs in pop" style={d(3)}>VS</div>
          </div>
        </div>
      );

    case 'facts':
      return (
        <div className={'facts n' + s.cards.length}>
          <Title text={s.title} />
          <div className="cards">
            {s.cards.map((c, i) => (
              <div key={i} className="fact in" style={{ ...d(i + 1), '--tilt': `${((i * 37) % 7) - 3}deg` } as CSSProperties}>
                <span className="fe">{c.emoji}</span>
                <b>{c.title}</b>
                {c.text && <p>{c.text}</p>}
              </div>
            ))}
          </div>
        </div>
      );

    case 'quiz': {
      const revealed = !thumb && (step >= 1 || picked !== null);
      const correct = s.options.indexOf(s.answer);
      return (
        <div className="quiz">
          <div className="quiz-head in" style={d(0)}>
            <span className="quiz-tag">Savol</span>
            {s.emoji && <span className="quiz-emoji">{s.emoji}</span>}
          </div>
          <h2 className="in" style={d(1)}>{s.question}</h2>
          <div className={'options n' + s.options.length}>
            {s.options.map((o, i) => {
              const cls = !revealed ? '' : i === correct ? ' ok' : i === picked ? ' bad' : ' dim';
              return (
                <button key={i} type="button" className={'option in' + cls} style={d(i + 2)} disabled={revealed || thumb}
                  onClick={(e) => { e.stopPropagation(); onPick?.(i); }}>
                  <span className="letter">{LETTERS[i]}</span>{o}
                </button>
              );
            })}
          </div>
          <div className="quiz-foot">
            {revealed ? (
              <div className="explain-line pop-in">
                {picked === null ? '💡' : picked === correct ? '🎉 To‘g‘ri!' : '🙂 Javob:'} {picked !== null && picked !== correct && <b>{s.answer}. </b>}{s.explain}
              </div>
            ) : <div className="hint">Javobni bosing yoki <kbd>1</kbd>–<kbd>{s.options.length}</kbd></div>}
          </div>
        </div>
      );
    }

    case 'activity':
      return <Activity s={s} thumb={thumb} />;

    case 'summary':
      return (
        <div className="summary">
          <Title text={s.title} />
          <ul>
            {s.points.map((p, i) => (
              <li key={i} className="in" style={d(i + 1)}><span className="tick">✓</span><span className="pe">{p.emoji}</span>{p.text}</li>
            ))}
          </ul>
        </div>
      );

    case 'ending':
      return (
        <div className="ending">
          <div className="end-mascot in pop" style={d(0)}>{s.emoji || deck.mascot.emoji}</div>
          <h1 className="in" style={d(1)}>{s.title}</h1>
          {s.text && <p className="in" style={d(2)}>{s.text}</p>}
          {!thumb && <Confetti />}
        </div>
      );
  }
}

function Activity({ s, thumb }: { s: Extract<Slide, { type: 'activity' }>; thumb?: boolean }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => {
      setLeft(left - 1);
      if (left - 1 === 0) beep(true);
    }, 1000);
    return () => clearTimeout(t);
  }, [left]);
  const total = s.seconds;
  const frac = left === null ? 1 : left / total;
  const R = 120, C = 2 * Math.PI * R;
  return (
    <div className="activity">
      <div className="act-text">
        <span className="act-tag in" style={d(0)}>{s.emoji} Faollik</span>
        <h2 className="in" style={d(1)}>{s.title}</h2>
        <p className="in" style={d(2)}>{s.instruction}</p>
      </div>
      <button type="button" className="timer in" style={d(3)} disabled={thumb}
        onClick={(e) => { e.stopPropagation(); setLeft(left === null || left === 0 ? total : null); }}>
        <svg viewBox="0 0 300 300">
          <circle cx="150" cy="150" r={R} className="track" />
          <circle cx="150" cy="150" r={R} className="bar" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
        </svg>
        <span className="time">{left === null ? `${total}s` : left === 0 ? 'Tamom!' : left}</span>
        <small>{left === null ? '▶ Boshlash' : left === 0 ? 'Yana' : 'To‘xtatish'}</small>
      </button>
    </div>
  );
}

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 60 }, (_, i) => (
        <i key={i} style={{
          left: `${(i * 53) % 100}%`,
          background: ['var(--primary)', 'var(--secondary)', 'var(--accent)'][i % 3],
          animationDelay: `${(i % 12) * 0.12}s`,
          animationDuration: `${2.4 + (i % 5) * 0.4}s`,
          transform: `rotate(${i * 29}deg)`,
        }} />
      ))}
    </div>
  );
}
