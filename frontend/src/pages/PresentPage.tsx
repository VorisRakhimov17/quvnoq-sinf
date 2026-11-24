import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { beep } from '../sound';
import SlideView, { stepsOf } from '../deck/SlideView';
import { loadDeckFonts, themeVars } from '../deck/theme';
import type { Presentation } from '../deck/types';
import '../deck/deck.css';

/** Sahna 1600×900 o'lchamda chiziladi va oynaga moslab kattalashtiriladi */
function useFit(ref: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / 1600, el.clientHeight / 900));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, ready]);
  return scale;
}

export default function PresentPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<Presentation | null>(null);
  const [error, setError] = useState('');
  const [i, setI] = useState(0);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [notes, setNotes] = useState(false);
  const [grid, setGrid] = useState(false);
  const [idle, setIdle] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDeckFonts();
    api.deck(Number(id)).then(setP, (e: Error) => setError(e.message));
  }, [id]);

  const scale = useFit(stageRef, !!p);
  const slides = p?.deck.slides ?? [];
  const slide = slides[i];

  const go = useCallback((n: number) => {
    if (n < 0 || n >= slides.length) return;
    setDir(n > i ? 1 : -1);
    setI(n);
    setStep(0);
    setPicked(null);
  }, [i, slides.length]);

  const next = useCallback(() => {
    if (slide && step < stepsOf(slide) && picked === null) setStep(step + 1);
    else go(i + 1);
  }, [slide, step, picked, go, i]);
  const prev = useCallback(() => {
    if (step > 0 && slide?.type === 'example') setStep(step - 1);
    else go(i - 1);
  }, [step, slide, go, i]);

  const pick = useCallback((k: number) => {
    if (!slide || slide.type !== 'quiz' || picked !== null || step > 0) return;
    setPicked(k);
    beep(slide.options[k] === slide.answer);
  }, [slide, picked, step]);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (grid) {
        if (k === 'Escape' || k === 'g' || k === 'G') setGrid(false);
        return;
      }
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
      else if (k === 'Home') go(0);
      else if (k === 'End') go(slides.length - 1);
      else if (k === 'f' || k === 'F') toggleFull();
      else if (k === 'n' || k === 'N') setNotes((x) => !x);
      else if (k === 'g' || k === 'G') setGrid(true);
      else if (/^[1-4]$/.test(k)) pick(Number(k) - 1);
      else if (k === 'Escape' && !document.fullscreenElement) nav('/kabinet?tab=prezentatsiya');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, go, pick, toggleFull, grid, slides.length, nav]);

  // Sichqoncha tinch tursa, boshqaruv paneli yashirinadi
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => { setIdle(false); clearTimeout(t); t = setTimeout(() => setIdle(true), 2500); };
    wake();
    window.addEventListener('mousemove', wake);
    return () => { window.removeEventListener('mousemove', wake); clearTimeout(t); };
  }, []);

  if (error) return <p className="empty">{error} <Link to="/kabinet?tab=prezentatsiya">Orqaga</Link></p>;
  if (!p || !slide) return <div className="present-loading">Yuklanmoqda…</div>;

  const deck = p.deck;
  const vars = themeVars(deck.theme);

  return (
    <div ref={rootRef} className={'present' + (idle ? ' idle' : '')} style={vars}>
      <div className="progress-top"><i style={{ width: `${((i + 1) / slides.length) * 100}%` }} /></div>

      <div ref={stageRef} className="stage-wrap"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (e.clientX - r.left < r.width * 0.25) prev(); else next();
        }}>
        <div className="stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
          <div key={i} className={`slide-anim m-${deck.theme.motion}`} data-dir={dir}>
            <SlideView deck={deck} slide={slide} index={i} step={step} picked={picked} onPick={pick} />
          </div>
        </div>
      </div>

      {notes && (
        <div className="notes-panel">
          <b>O‘qituvchi uchun:</b> {slide.notes || '—'}
        </div>
      )}

      <div className="controls">
        <Link className="cbtn" to="/kabinet?tab=prezentatsiya" title="Chiqish (Esc)">✕</Link>
        <button className="cbtn" onClick={prev} disabled={i === 0 && step === 0} title="Oldingi (←)">←</button>
        <span className="counter">{i + 1} / {slides.length}</span>
        <button className="cbtn" onClick={next} disabled={i === slides.length - 1 && step >= stepsOf(slide)} title="Keyingi (→ yoki probel)">→</button>
        <button className="cbtn" onClick={() => setGrid(true)} title="Barcha slaydlar (G)">▦</button>
        <button className="cbtn" aria-pressed={notes} onClick={() => setNotes(!notes)} title="Izohlar (N)">📝</button>
        <button className="cbtn" onClick={toggleFull} title="To‘liq ekran (F)">⛶</button>
      </div>

      {grid && (
        <div className="grid-view" onClick={() => setGrid(false)}>
          <div className="grid-head">
            <strong>{deck.title}</strong>
            <span>{slides.length} ta slayd · Esc — yopish</span>
          </div>
          <div className="thumbs">
            {slides.map((s, k) => (
              <Thumb key={k} current={k === i} onClick={() => { go(k); setGrid(false); }}>
                <SlideView deck={deck} slide={s} index={k} step={9} picked={null} thumb />
              </Thumb>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Kichik nusxa: 1600×900 slayd tugma kengligiga moslab kichraytiriladi */
function Thumb({ current, onClick, children }: { current: boolean; onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.15);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setK(el.clientWidth / 1600);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    // Ichida savol tugmalari bor, shuning uchun <button> emas (ichma-ich tugma bo'lmaydi)
    <div ref={ref} role="button" tabIndex={0} className={'thumb' + (current ? ' current' : '')}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick(); } }}>
      <div className="thumb-inner" style={{ transform: `scale(${k})` }}>{children}</div>
    </div>
  );
}
