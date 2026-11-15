import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import GamePage from './pages/GamePage';
import Home from './pages/Home';
import Login from './pages/Login';
import TeacherPage from './pages/TeacherPage';
import { useSettings } from './settings';

function Header() {
  const { teacher } = useAuth();
  return (
    <header className="brand">
      <Link to="/" className="brand-link">
        <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
          <rect x="2" y="2" width="50" height="50" rx="14" fill="var(--card)" stroke="var(--line)" strokeWidth="2" />
          <circle cx="16" cy="18" r="6" fill="var(--math)" />
          <rect x="31" y="12" width="12" height="12" rx="3" fill="var(--lang)" />
          <path d="M27 42 L19 30 L35 30 Z" fill="var(--nature)" />
        </svg>
        <div>
          <h1>Quvnoq Sinf</h1>
          <p>Boshlang‘ich sinflar uchun o‘yinli darslar</p>
        </div>
      </Link>
      <nav>
        {teacher ? (
          <Link className="ghost" to="/kabinet">{teacher.name}: kabinet</Link>
        ) : (
          <Link className="ghost" to="/kirish">O‘qituvchi kirishi</Link>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  const settings = useSettings();
  const inGame = useLocation().pathname.startsWith('/oyin/');
  return (
    <div className="wrap">
      {!inGame && <Header />}
      <Routes>
        <Route path="/" element={<Home settings={settings} />} />
        <Route path="/oyin/:id" element={<GamePage settings={settings} />} />
        <Route path="/kirish" element={<Login />} />
        <Route path="/kabinet" element={<TeacherPage />} />
        <Route path="*" element={<p className="empty">Sahifa topilmadi. <Link to="/">Bosh sahifaga qaytish</Link></p>} />
      </Routes>
    </div>
  );
}
