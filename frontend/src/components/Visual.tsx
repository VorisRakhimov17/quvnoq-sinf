import { Fragment } from 'react';
import { VOWELS, units } from '../games/lang';
import type { Visual as V } from '../games/types';

/** "{?}" belgisini bo'sh katakka aylantiradi */
function withBlanks(text: string) {
  const parts = text.split('{?}');
  return parts.map((p, i) => (
    <Fragment key={i}>
      {p}
      {i < parts.length - 1 && <span className="blank">?</span>}
    </Fragment>
  ));
}

export function VowelWord({ word }: { word: string }) {
  return (
    <span className="word">
      {units(word).map((u, i) => (VOWELS.includes(u) ? <span key={i} className="v">{u}</span> : u))}
    </span>
  );
}

export default function Visual({ v }: { v: V }) {
  switch (v.type) {
    case 'expr':
      return <span className="expr">{withBlanks(v.text)}</span>;
    case 'pic':
      return (
        <>
          <div className="pic">{v.emoji}</div>
          {v.word && <div className="word">{withBlanks(v.word)}</div>}
        </>
      );
    case 'pile':
      return (
        <div className="count-pile">
          {Array.from({ length: v.n }, (_, i) => <span key={i}>{v.emoji}</span>)}
        </div>
      );
    case 'grid':
      return (
        <div className="count-grid">
          {Array.from({ length: v.rows }, (_, r) => (
            <div key={r}>{Array.from({ length: v.cols }, (_, c) => <span key={c}>{v.emoji}</span>)}</div>
          ))}
        </div>
      );
    case 'text':
      return (
        <>
          {v.emoji && <div className="pic">{v.emoji}</div>}
          <div className="prompt-text">{v.text}</div>
        </>
      );
  }
}
