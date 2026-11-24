import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

export default function Login() {
  const { teacher, signIn } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('r') ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (teacher) return <Navigate to="/kabinet" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const s = mode === 'login' ? await api.login(email, password) : await api.register(name, email, password);
      signIn(s);
      nav('/kabinet');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-side">
        <h1>{mode === 'login' ? 'Xush kelibsiz!' : 'Quvnoq Sinfga qo‘shiling'}</h1>
        <ul>
          <li><span>🎬</span>Mavzu bo‘yicha dars prezentatsiyasi bir daqiqada</li>
          <li><span>🎮</span>Har bir mavzuga 5 xil o‘yin: viktorina, juftini top va boshqalar</li>
          <li><span>👥</span>Proyektorda ikki jamoa bo‘lib bellashuv</li>
          <li><span>📊</span>Natijalar kabinetingizda saqlanadi</li>
        </ul>
        <div className="gift">🎁 Ro‘yxatdan o‘tganingizda 5 ta bepul kredit</div>
      </div>

      <form className="form auth-form" onSubmit={submit}>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Kirish</button>
          <button type="button" role="tab" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>Ro‘yxatdan o‘tish</button>
        </div>
        <h2>{mode === 'login' ? 'Hisobingizga kiring' : 'Yangi hisob yaratish'}</h2>
        {mode === 'register' && (
          <label>Ism-familiya
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" placeholder="Masalan: Dilnoza Karimova" />
          </label>
        )}
        <label>Email
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="email@misol.uz" />
        </label>
        <label>Parol
          <input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'register' && <small>Kamida 8 belgi</small>}
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary big" disabled={busy}>
          {busy ? 'Kuting…' : mode === 'login' ? 'Kirish' : 'Hisob yaratish va 5 kredit olish'}
        </button>
        <p className="muted">
          {mode === 'login' ? 'Hisobingiz yo‘qmi? ' : 'Hisobingiz bormi? '}
          <button type="button" className="linkish" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Ro‘yxatdan o‘ting' : 'Kiring'}
          </button>
        </p>
      </form>
    </div>
  );
}
