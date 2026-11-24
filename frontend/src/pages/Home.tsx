import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { sectionLink } from '../nav';
import { useAuth } from '../auth';
import { GAMES, SUBJECTS } from '../games';
import type { Grade, SubjectId } from '../games/types';
import type { SettingsApi } from '../settings';

const SUBJECT_ICON: Record<SubjectId, string> = { math: '🔢', lang: '📖', nature: '🌿' };
const SHORT: Record<SubjectId, string> = { math: 'Matematika', lang: 'Ona tili', nature: 'Tabiat' };

export default function Home({ settings }: { settings: SettingsApi }) {
  const { teacher } = useAuth();
  const { grade, teams, update } = settings;
  const [only, setOnly] = useState<SubjectId | 'all'>('all');
  const subjects = (Object.keys(SUBJECTS) as SubjectId[]).filter((s) => only === 'all' || s === only);

  return (
    <>
      <section className="hero">
        <div>
          <span className="badge-line">✨ Boshlang‘ich sinf o‘qituvchilari uchun</span>
          <h1>Darsni <em>quvnoq o‘yinga</em> aylantiring</h1>
          <p className="lead">
            Bugungi mavzuni yozing — sun’iy intellekt bir daqiqada dars prezentatsiyasi va 5 xil o‘yin tayyorlaydi.
            Proyektorda butun sinf yoki ikki jamoa bo‘lib o‘ynang.
          </p>
          <div className="hero-actions">
            {teacher ? (
              <>
                <Link className="primary big" to={sectionLink('oyin')}>🎮 O‘yin yaratish</Link>
                <Link className="ghost big" to={sectionLink('prezentatsiya')}>🎬 Prezentatsiya yaratish</Link>
              </>
            ) : (
              <>
                <Link className="primary big" to="/kirish?r=1">Bepul boshlash</Link>
                <a className="ghost big" href="#tayyor">Tayyor o‘yinlarni ko‘rish ↓</a>
              </>
            )}
          </div>
          <p className="hero-note">{teacher ? `Sizda 💎 ${teacher.credits} kredit bor.` : '🎁 Ro‘yxatdan o‘tganlarga 5 ta bepul kredit'}</p>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hc hc-team"><span className="a">1-jamoa: 7</span><span className="b">2-jamoa: 6</span></div>
          <div className="hc hc-slide">
            <div className="hc-top">🐫</div>
            <div className="hc-body"><b>Ikki xonali sonlarni qo‘shish</b><small>Ipak yo‘li karvoni · 14 slayd</small></div>
          </div>
          <div className="hc hc-quiz">
            <b>52 + 36 = ?</b>
            <div className="hc-opts"><span className="ok">A · 88</span><span>B · 78</span><span>C · 86</span><span>D · 98</span></div>
          </div>
          <div className="hc hc-stars"><span className="st">★★★</span><b>Barakalla!</b></div>
        </div>
      </section>

      <section className="features">
        <Feature to={teacher ? sectionLink('prezentatsiya') : '/kirish?r=1'} icon="🎬" color="var(--brand)" title="Dars prezentatsiyasi"
          text="Rasmlar, misollar, savollar va taymerli faollik bilan. Har biri o‘z dizayni va syujetiga ega." />
        <Feature to={teacher ? sectionLink('oyin') : '/kirish?r=1'} icon="🎮" color="var(--coral)" title="5 xil o‘yin bir mavzuda"
          text="Viktorina, to‘g‘ri-noto‘g‘ri, juftini top, guruhlarga ajrat, tartibga sol." />
        <Feature to="#tayyor" icon="👥" color="var(--nature)" title="Jamoa bellashuvi"
          text="Sinfni ikki jamoaga bo‘ling — navbat, hisob va g‘olibni sayt o‘zi yuritadi." />
      </section>

      <section id="tayyor">
        <div className="section-head">
          <div>
            <h2>🧩 Tayyor o‘yinlar</h2>
            <p>Hech narsa yaratmasdan darhol o‘ynash mumkin — kredit kerak emas.</p>
          </div>
        </div>
        <div className="toolbar">
          <label>Sinf
            <span className="seg">
              {([1, 2, 3, 4] as Grade[]).map((g) => (
                <button key={g} aria-pressed={g === grade} onClick={() => update({ grade: g })}>{g}-sinf</button>
              ))}
            </span>
          </label>
          <label>Tartib
            <span className="seg">
              <button aria-pressed={!teams} onClick={() => update({ teams: false })}>Butun sinf</button>
              <button aria-pressed={teams} onClick={() => update({ teams: true })}>👥 Ikki jamoa</button>
            </span>
          </label>
          <label>Fan
            <span className="seg">
              <button aria-pressed={only === 'all'} onClick={() => setOnly('all')}>Hammasi</button>
              {(Object.keys(SUBJECTS) as SubjectId[]).map((s) => (
                <button key={s} aria-pressed={only === s} onClick={() => setOnly(s)}>{SUBJECT_ICON[s]} {SHORT[s]}</button>
              ))}
            </span>
          </label>
          <p className="tip">
            Proyektorda oching va <b>Katta ekran</b>ni bosing. Javobni <b>1–4</b> raqamlari bilan tanlash mumkin, <b>Enter</b> — keyingi savol.
            {teacher ? ' Natijalar kabinetingizga saqlanadi.' : ' Natijalarni saqlash uchun kiring.'}
          </p>
        </div>

        {subjects.map((s) => {
          const list = GAMES.filter((g) => g.subject === s && (!g.custom || teacher));
          return (
            <section key={s} className="subject" style={{ '--c': SUBJECTS[s].color } as CSSProperties}>
              <div className="subject-head">
                <span className="sdot">{SUBJECT_ICON[s]}</span>
                <h2>{SUBJECTS[s].name}</h2>
                <span>{list.length} ta o‘yin</span>
              </div>
              <div className="cards">
                {list.map((g) => (
                  <Link key={g.id} to={`/oyin/${g.id}`} className="game-card">
                    <div className="sample">{g.sample}</div>
                    <div className="card-body">
                      <strong>{g.title}</strong>
                      <small>{g.desc(grade)}</small>
                      <span className="go">▶ O‘ynash</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </>
  );
}

function Feature({ to, icon, color, title, text }: { to: string; icon: string; color: string; title: string; text: string }) {
  const body = (
    <>
      <span className="fi">{icon}</span>
      <b>{title}</b>
      <p>{text}</p>
      <span className="go">Boshlash →</span>
    </>
  );
  const style = { '--fc': color } as CSSProperties;
  return to.startsWith('#')
    ? <a className="feature" href={to} style={style}>{body}</a>
    : <Link className="feature" to={to} style={style}>{body}</Link>;
}
