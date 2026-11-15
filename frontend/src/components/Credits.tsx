import { useEffect, useState } from 'react';
import { api, type CreditTx } from '../api';
import { useAuth } from '../auth';
import { CONTACT, PACKAGES, formatSum } from '../config';

const REASON: Record<CreditTx['reason'], string> = {
  welcome: 'Sovg‘a',
  generate: 'O‘yin yaratildi',
  refund: 'Qaytarildi',
  purchase: 'Sotib olindi',
  admin: 'Admin',
};

/** Paketlar va qanday sotib olish: kabinetda ham, kredit tugaganda ham ko'rsatiladi */
export function BuyBox() {
  const { teacher } = useAuth();
  const hasContact = CONTACT.telegram || CONTACT.phone;
  return (
    <div className="buy">
      <div className="packages">
        {PACKAGES.map((p) => (
          <div key={p.credits} className={'package' + (p.best ? ' best' : '')}>
            {p.best && <span className="badge">Qulay</span>}
            <strong>{p.credits} ta o‘yin</strong>
            <span className="price">{formatSum(p.price)}</span>
            <small>1 o‘yin ≈ {formatSum(Math.round(p.price / p.credits))}</small>
          </div>
        ))}
      </div>
      <div className="how">
        <strong>Qanday sotib olinadi?</strong>
        <ol>
          <li>
            Biz bilan bog‘laning
            {hasContact ? ':' : '.'}
            {CONTACT.telegram && <> Telegram <a href={`https://t.me/${CONTACT.telegram}`} target="_blank" rel="noreferrer">@{CONTACT.telegram}</a></>}
            {CONTACT.telegram && CONTACT.phone && ' yoki'}
            {CONTACT.phone && <> telefon <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}>{CONTACT.phone}</a></>}
          </li>
          <li>Paketni tanlab, Click yoki Payme orqali to‘lang.</li>
          <li>
            Emailingizni ayting: <code>{teacher?.email}</code> — kredit bir necha daqiqada hisobingizga tushadi.
          </li>
        </ol>
      </div>
    </div>
  );
}

export default function Credits() {
  const { setCredits } = useAuth();
  const [data, setData] = useState<{ credits: number; history: CreditTx[] } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.credits().then((d) => { setData(d); setCredits(d.credits); }, (e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Yuklanmoqda…</p>;

  return (
    <div className="credits">
      <div className="balance">
        <span className="big">💎 {data.credits}</span>
        <div>
          <strong>kredit qoldi</strong>
          <p className="muted">1 kredit = mavzu bo‘yicha 1 ta AI o‘yin (5, 10 yoki 15 savol). Tayyor o‘yinlarni qayta o‘ynash bepul.</p>
        </div>
      </div>

      <h3>Kredit sotib olish</h3>
      <BuyBox />

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
