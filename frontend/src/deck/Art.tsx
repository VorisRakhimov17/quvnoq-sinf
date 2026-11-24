import { useMemo } from 'react';

/* AI chizgan SVG faqat oq ro'yxatdagi teg va atributlar bilan ko'rsatiladi (skript, havola, tashqi resurs yo'q) */
const TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'defs',
  'lineargradient', 'radialgradient', 'stop', 'clippath', 'title',
]);
const ATTRS = new Set([
  'xmlns', 'viewbox', 'preserveaspectratio', 'id', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'width', 'height', 'points', 'transform', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-opacity', 'fill-opacity', 'fill-rule', 'clip-rule', 'opacity', 'offset', 'stop-color',
  'stop-opacity', 'gradientunits', 'gradienttransform', 'fx', 'fy', 'fr', 'clip-path', 'spreadmethod',
]);

export function sanitizeSvg(src: string): string | null {
  if (!src || typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;

  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      if (!TAGS.has(child.nodeName.toLowerCase())) { child.remove(); continue; }
      walk(child);
    }
    for (const a of [...el.attributes]) {
      const name = a.name.toLowerCase();
      const v = a.value;
      if (!ATTRS.has(name) || /javascript:|expression\(/i.test(v) || (/url\(/i.test(v) && !/^url\(\s*#[\w-]+\s*\)$/i.test(v.trim()))) {
        el.removeAttribute(a.name);
      }
    }
  };
  walk(root);
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', '0 0 400 300');
  root.removeAttribute('width');
  root.removeAttribute('height');
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  // Bir sahifada bir nechta SVG bo'lsa, gradient id lari to'qnashmasin
  const suffix = Math.random().toString(36).slice(2, 7);
  const ids = [...root.querySelectorAll('[id]')].map((e) => e.id);
  let out = new XMLSerializer().serializeToString(root);
  for (const id of ids) {
    const safe = id.replace(/[^\w-]/g, '');
    if (!safe) continue;
    out = out.split(`"${id}"`).join(`"${safe}-${suffix}"`).split(`#${id})`).join(`#${safe}-${suffix})`);
  }
  return out;
}

/** Slayd rasmi: SVG bo'lsa o'sha, bo'lmasa katta emoji shakl ichida */
export default function Art({ svg, emoji, className = '' }: { svg?: string; emoji?: string; className?: string }) {
  const clean = useMemo(() => (svg ? sanitizeSvg(svg) : null), [svg]);
  if (clean) return <div className={'art ' + className} dangerouslySetInnerHTML={{ __html: clean }} />;
  if (!emoji) return null;
  return (
    <div className={'art art-emoji ' + className}>
      <span className="art-blob" />
      <span className="art-glyph">{emoji}</span>
    </div>
  );
}
