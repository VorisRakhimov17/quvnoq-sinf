import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

export default function Login() {
  const { teacher, signIn } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
    <div className="panel narrow">
      <div className="chips tabs">
        <button className="chip" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Kirish</button>
        <button className="chip" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>Ro‘yxatdan o‘tish</button>
      </div>
      <form className="form" onSubmit={submit}>
        {mode === 'register' && (
          <label>Ism-familiya
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
          </label>
        )}
        <label>Email
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>Parol
          <input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'register' && <small>Kamida 8 belgi</small>}
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Kuting…' : mode === 'login' ? 'Kirish' : 'Akkaunt yaratish'}
        </button>
      </form>
    </div>
  );
}
