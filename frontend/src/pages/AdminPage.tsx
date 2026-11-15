import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { api, type AdminTeacher } from '../api';
import { useAuth } from '../auth';
import { PACKAGES, formatSum } from '../config';

/** Admin: o'qituvchini topib, to'lovdan keyin kredit qo'shish */
export default function AdminPage() {
  const { teacher, loading, setCredits } = useAuth();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminTeacher[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [custom, setCustom] = useState<Record<number, string>>({});

  const load = (s = q) => api.adminTeachers(s.trim()).then(setRows, (e: Error) => setError(e.message));
  useEffect(() => { if (teacher?.isAdmin) load(''); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [teacher?.isAdmin]);

  if (loading) return <p className="empty">Yuklanmoqda…</p>;
  if (!teacher) return <Navigate to="/kirish" replace />;
  if (!teacher.isAdmin) return <p className="empty">Bu sahifa faqat admin uchun.</p>;

  function search(e: FormEvent) { e.preventDefault(); setMsg(''); load(); }

  async function grant(t: AdminTeacher, amount: number, reason: 'purchase' | 'admin', note?: string) {
    const sign = amount > 0 ? `+${amount}` : String(amount);
    if (!confirm(`${t.name} (${t.email}) ga ${sign} kredit. Tasdiqlaysizmi?`)) return;
    setError(''); setMsg('');
    try {
      const r = await api.adminGrant({ teacherId: t.id, amount, reason, note });
      setRows((rs) => rs!.map((x) => (x.id === t.id ? { ...x, credits: r.credits } : x)));
      if (t.id === teacher!.id) setCredits(r.credits);
      setMsg(`${t.name}: ${sign} kredit. Yangi balans: ${r.credits}`);
      setCustom((c) => ({ ...c, [t.id]: '' }));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Admin: kreditlar</h2>
          <p className="muted">To‘lov kelgach, o‘qituvchini email bo‘yicha toping va paket tugmasini bosing.</p>
        </div>
      </div>
      <form className="form admin-search" onSubmit={search}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email yoki ism" aria-label="Qidirish" />
        <button className="ghost">Qidirish</button>
      </form>
      {msg && <p className="ok-msg">{msg}</p>}
      {error && <p className="error">{error}</p>}
      {!rows ? <p className="muted">Yuklanmoqda…</p> : rows.length === 0 ? <p className="empty">Hech kim topilmadi.</p> : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>O‘qituvchi</th><th>Kredit</th><th>To‘lov bo‘yicha qo‘shish</th><th>Qo‘lda</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong><br /><small className="muted">{t.email}</small></td>
                  <td className="num">💎 {t.credits}</td>
                  <td>
                    <div className="btn-row">
                      {PACKAGES.map((p) => (
                        <button key={p.credits} className="ghost small" title={formatSum(p.price)}
                          onClick={() => grant(t, p.credits, 'purchase', `${p.credits} ta paket, ${formatSum(p.price)}`)}>
                          +{p.credits}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="btn-row">
                      <input className="num-in" type="number" value={custom[t.id] ?? ''} placeholder="±"
                        onChange={(e) => setCustom((c) => ({ ...c, [t.id]: e.target.value }))} aria-label="Kredit soni" />
                      <button className="ghost small" onClick={() => {
                        const n = Math.trunc(Number(custom[t.id]));
                        if (!n) { setError('Son kiriting (masalan 5 yoki -2).'); return; }
                        grant(t, n, 'admin', 'Qo‘lda o‘zgartirildi');
                      }}>OK</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
