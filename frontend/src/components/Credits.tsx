import { useCallback, useEffect, useState } from 'react';
import { api, type CreditTx, type Purchase, type PurchaseConfig, type PurchaseStatus } from '../api';
import { useAuth } from '../auth';
import { formatSum } from '../config';

const REASON: Record<CreditTx['reason'], string> = {
  welcome: 'Sovg‘a',
  generate: 'O‘yin yaratildi',
  refund: 'Qaytarildi',
  purchase: 'Sotib olindi',
  admin: 'Admin',
};

const STATUS: Record<PurchaseStatus, string> = {
  pending: 'Chek kutilmoqda',
  submitted: 'Tekshirilmoqda',
  approved: 'Tasdiqlandi',
  rejected: 'Rad etildi',
};

/** Paket tanlash → karta raqami → Telegram botga chek yuborish */
export function BuyBox({ onChange }: { onChange?: () => void }) {
  const [cfg, setCfg] = useState<PurchaseConfig | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [order, setOrder] = useState<Purchase | null>(null);
  const [mine, setMine] = useState<Purchase[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadMine = () => api.myPurchases().then(setMine, () => {});
  useEffect(() => {
    api.purchaseConfig().then((c) => { setCfg(c); setSel(c.packages.find((p) => p.best)?.credits ?? c.packages[0]?.credits ?? null); },
      (e: Error) => setError(e.message));
    loadMine();
  }, []);

  // Tekshirilayotgan buyurtma bo'lsa, holatini har 10 soniyada yangilaymiz
  const waiting = mine.some((p) => p.status === 'pending' || p.status === 'submitted');
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(async () => {
      const before = mine.filter((p) => p.status === 'approved').length;
      const list = await api.myPurchases().catch(() => null);
      if (!list) return;
      setMine(list);
      if (list.filter((p) => p.status === 'approved').length !== before) onChange?.();
    }, 10_000);
    return () => clearInterval(t);
  }, [waiting, mine, onChange]);

  if (!cfg) return error ? <p className="error">{error}</p> : <p className="muted">Yuklanmoqda…</p>;
  const ready = !!cfg.card && !!cfg.bot;

  async function buy() {
    if (sel === null) return;
    setBusy(true); setError('');
    try {
      const p = await api.createPurchase(sel);
      setOrder(p);
      loadMine();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(cfg!.card!.replace(/\s/g, '')); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }

  return (
    <div className="buy">
      <div className="packages" role="radiogroup" aria-label="Paketni tanlang">
        {cfg.packages.map((p) => (
          <button key={p.credits} type="button" role="radio" aria-checked={sel === p.credits}
            className={'package' + (p.best ? ' best' : '') + (sel === p.credits ? ' selected' : '')}
            onClick={() => { setSel(p.credits); setOrder(null); }}>
            {p.best && <span className="badge">Qulay</span>}
            <strong>{p.credits} kredit</strong>
            <span className="price">{formatSum(p.price)}</span>
            <small>1 kredit ≈ {formatSum(Math.round(p.price / p.credits))}</small>
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="notice muted">Onlayn to‘lov hali sozlanmagan. Tez orada ishga tushadi.</p>
      ) : !order ? (
        <button className="primary buy-btn" disabled={busy || sel === null} onClick={buy}>
          {busy ? 'Kuting…' : `Sotib olish: ${sel} kredit`}
        </button>
      ) : (
        <div className="pay-steps">
          <div className="pay-step">
            <span className="step-n">1</span>
            <div>
              <strong>{formatSum(order.price)} ni shu kartaga o‘tkazing</strong>
              <div className="card-row">
                <code className="card-no">{(cfg.card ?? '').replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')}</code>
                <button className="ghost small" onClick={copy}>{copied ? 'Nusxalandi ✓' : 'Nusxalash'}</button>
              </div>
              {cfg.owner && <small className="muted">Karta egasi: {cfg.owner}</small>}
            </div>
          </div>
          <div className="pay-step">
            <span className="step-n">2</span>
            <div>
              <strong>Chekni Telegram botga yuboring</strong>
              <p className="muted">Tugma botni ochadi. U yerda <b>Start</b>ni bosing va to‘lov chekining skrinshotini yuboring.</p>
              <a className="primary small tg-btn" href={order.botLink ?? '#'} target="_blank" rel="noreferrer">📨 Chekni yuborish</a>
            </div>
          </div>
          <div className="pay-step">
            <span className="step-n">3</span>
            <div>
              <strong>Tasdiqlashni kuting</strong>
              <p className="muted">Chek tekshirilgach, {order.credits} kredit hisobingizga tushadi va bot sizga xabar beradi. Buyurtma: <code>#{order.code}</code></p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {mine.length > 0 && (
        <div className="my-orders">
          <strong>Buyurtmalarim</strong>
          <ul>
            {mine.slice(0, 5).map((p) => (
              <li key={p.id}>
                <span>#{p.code} · {p.credits} kredit · {formatSum(p.price)}</span>
                <span className={'status ' + p.status}>{STATUS[p.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Credits() {
  const { setCredits } = useAuth();
  const [data, setData] = useState<{ credits: number; history: CreditTx[] } | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    api.credits().then((d) => { setData(d); setCredits(d.credits); }, (e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(reload, [reload]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Yuklanmoqda…</p>;

  return (
    <div className="credits">
      <div className="balance">
        <span className="big">💎 {data.credits}</span>
        <div>
          <strong>kredit qoldi</strong>
          <p className="muted">🎮 O‘yinlar to‘plami — 1 kredit · 🎬 prezentatsiya — 3 kredit. Tayyor o‘yinlar va saqlanganlarini qayta ochish bepul.</p>
        </div>
      </div>

      <h3>Kredit sotib olish</h3>
      <BuyBox onChange={reload} />

      <h3>Tarix</h3>
      {data.history.length === 0 ? <p className="empty">Hali harakat yo‘q.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sana</th><th>Turi</th><th>Izoh</th><th>Kredit</th></tr></thead>
            <tbody>
              {data.history.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{REASON[t.reason]}</td>
                  <td>{t.note ?? ''}</td>
                  <td className={'num ' + (t.amount > 0 ? 'plus' : 'minus')}>{t.amount > 0 ? `+${t.amount}` : t.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
