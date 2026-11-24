import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import AdminPage from './pages/AdminPage';
import AdventurePlay from './pages/AdventurePlay';
import GamePage from './pages/GamePage';
import Home from './pages/Home';
import Login from './pages/Login';
import PackPage from './pages/PackPage';
import PresentPage from './pages/PresentPage';
import TeacherPage from './pages/TeacherPage';
import { SECTIONS, sectionLink, type SectionId } from './nav';
import { useSettings } from './settings';

export function Logo() {
  return (
    <svg viewBox="0 0 54 54" aria-hidden="true">
      {/* Ko'k daftar: to'q ko'k fon, qizil olma, sariq qalam, tabassum */}
      <rect x="1" y="1" width="52" height="52" rx="14" fill="#1E3A8A" />
      <circle cx="18" cy="20" r="6" fill="#DC2626" />
      <rect x="30" y="14" width="12" height="12" rx="3" fill="#FBBF24" />
      <path d="M14 34 Q27 45 40 34" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

function useSection(): SectionId | 'home' | null {
  const { pathname, search } = useLocation();
  if (pathname === '/') return 'home';
  if (pathname !== '/kabinet') return null;
  const t = new URLSearchParams(search).get('tab');
  return (SECTIONS.find((s) => s.id === (t === 'topic' ? 'oyin' : t))?.id ?? 'panel');
}

function Header() {
  const { teacher } = useAuth();
  const at = useSection();
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link to="/" className="logo" aria-label="Quvnoq Sinf — bosh sahifa">
          <Logo />
          <span><b>Quvnoq Sinf</b><small>1–4-sinflar uchun o‘yinli darslar</small></span>
        </Link>
        <nav className="mainnav" aria-label="Asosiy menyu">
          <Link to="/" className={at === 'home' ? 'active' : ''}>🧩 Tayyor o‘yinlar</Link>
          {teacher && (
            <>
              <Link to={sectionLink('oyin')} className={at === 'oyin' ? 'active' : ''}>🎮 O‘yin yaratish</Link>
              <Link to={sectionLink('prezentatsiya')} className={at === 'prezentatsiya' ? 'active' : ''}>🎬 Prezentatsiya</Link>
              <Link to={sectionLink('sarguzasht')} className={at === 'sarguzasht' ? 'active' : ''}>🗺️ Sarguzasht</Link>
            </>
          )}
        </nav>
        <div className="top-right">
          {teacher ? (
            <>
              {teacher.isAdmin && <Link className="ghost small" to="/admin">⚙️ Admin</Link>}
              <Link className="credit-chip" to={sectionLink('kredit')} title="Kredit balansi">💎 {teacher.credits}</Link>
              <Link className="user-chip" to="/kabinet" title="Mening kabinetim">
                <span className="avatar">{teacher.name.trim()[0]?.toUpperCase() ?? '?'}</span>
                <span className="uname">Kabinet</span>
              </Link>
            </>
          ) : (
            <>
              <Link className="ghost" to="/kirish">Kirish</Link>
              <Link className="primary small" to="/kirish?r=1">Bepul boshlash</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Telefon uchun pastki menyu: asosiy bo'limlar doim barmoq ostida */
function TabBar() {
  const { teacher } = useAuth();
  const at = useSection();
  if (!teacher) return null;
  const items = [
    { to: '/', icon: '🧩', label: 'Tayyor', on: at === 'home' },
    ...SECTIONS.filter((s) => s.id !== 'questions' && s.id !== 'results' && s.id !== 'kredit').map((s) => ({ to: sectionLink(s.id), icon: s.icon, label: s.short, on: at === s.id })),
  ];
  return (
    <nav className="tabbar" aria-label="Pastki menyu">
      {items.map((it) => (
        <Link key={it.to} to={it.to} className={it.on ? 'active' : ''}><span className="ti">{it.icon}</span>{it.label}</Link>
      ))}
    </nav>
  );
}

export default function App() {
  const settings = useSettings();
  const path = useLocation().pathname;
  const inGame = path.startsWith('/oyin/') || path.startsWith('/prezentatsiya/') || path.startsWith('/toplam/') || path.startsWith('/sarguzasht/');
  return (
    <>
      {!inGame && <Header />}
      <div className="wrap">
        <Routes>
          <Route path="/" element={<Home settings={settings} />} />
          <Route path="/oyin/:id" element={<GamePage settings={settings} />} />
          <Route path="/kirish" element={<Login />} />
          <Route path="/kabinet" element={<TeacherPage />} />
          <Route path="/prezentatsiya/:id" element={<PresentPage />} />
          <Route path="/toplam/:id" element={<PackPage settings={settings} />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/sarguzasht/:code" element={<AdventurePlay />} />
          <Route path="*" element={<p className="empty">Sahifa topilmadi. <Link to="/">Bosh sahifaga qaytish</Link></p>} />
        </Routes>
      </div>
      {!inGame && <TabBar />}
    </>
  );
}
