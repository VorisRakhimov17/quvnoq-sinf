import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { GAMES, SUBJECTS } from '../games';
import type { Grade, SubjectId } from '../games/types';
import type { SettingsApi } from '../settings';

export default function Home({ settings }: { settings: SettingsApi }) {
  const { teacher } = useAuth();
  const { grade, teams, update } = settings;

  return (
    <>
      <div className="setup">
        <div>
          <h2>Sinf</h2>
          <div className="chips">
            {([1, 2, 3, 4] as Grade[]).map((g) => (
              <button key={g} className="chip" aria-pressed={g === grade} onClick={() => update({ grade: g })}>
                {g}-sinf
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2>O‘yin tartibi</h2>
          <div className="chips">
            <button className="chip" aria-pressed={!teams} onClick={() => update({ teams: false })}>Butun sinf</button>
            <button className="chip" aria-pressed={teams} onClick={() => update({ teams: true })}>Ikki jamoa</button>
          </div>
        </div>
        <p className="tip">
          Proyektorda oching va <b>Katta ekran</b> tugmasini bosing. Bolalar javobni aytadi, siz bosasiz. Javobni
          klaviaturadagi <b>1–4</b> raqamlari bilan ham tanlash mumkin, <b>Enter</b> keyingi savolga o‘tkazadi.
          {teacher ? ' Natijalar kabinetingizga saqlanadi.' : ' Natijalarni saqlash uchun o‘qituvchi sifatida kiring.'}
        </p>
      </div>

      {(Object.keys(SUBJECTS) as SubjectId[]).map((s) => {
        const list = GAMES.filter((g) => g.subject === s && (!g.custom || teacher));
        return (
          <section key={s} className="subject" style={{ '--c': SUBJECTS[s].color } as CSSProperties}>
            <div className="subject-head">
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
                    <span className="go">Boshlash →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
