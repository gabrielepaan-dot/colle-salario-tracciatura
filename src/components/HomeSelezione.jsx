import { useNavigate } from 'react-router-dom'
import './HomeSelezione.css'

// Schermata radice: scelta tra le due modalità di tracciatura, Boulder e
// Corda. Design fedele al mockup validato da Gabriele (vedi PR/spec
// "Separazione Boulder / Corda") — gradienti radiali e curva animata non
// esprimibili con utility Tailwind, quindi CSS dedicato in HomeSelezione.css.
// boulderTo/cordaTo: personalizzano le destinazioni di navigazione così
// questo componente è riusabile invariato anche dalla Vista pubblica
// (#/pubblico), che vive sotto un prefisso diverso dall'app autenticata.
// verbo: "tracciamo" per i tracciatori, "scaliamo" per i clienti nella Vista
// pubblica — stessa domanda, punto di vista diverso.
export default function HomeSelezione({ boulderTo = '/boulder', cordaTo = '/corda', verbo = 'tracciamo' }) {
  const navigate = useNavigate()

  return (
    <div className="home-selezione max-w-2xl mx-auto bg-grafite text-gesso">
      <header className="home-selezione__header">
        <div className="font-barlow font-semibold text-[12px] tracking-[0.22em] text-pietra uppercase">
          A.S.D. Colle Salario
        </div>
        <h1 className="font-archivo text-[28px] leading-[1.05] mt-1.5">
          Dove {verbo}
          <br />
          oggi?
        </h1>
      </header>

      <div className="home-selezione__choices">
        <button
          type="button"
          onClick={() => navigate(boulderTo)}
          className="home-card home-card--boulder"
          aria-label="Vai alla sezione Boulder"
        >
          <svg className="home-card__holds" viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path
              d="M40 55 C 20 50, 15 75, 35 82 C 55 90, 75 78, 70 60 C 66 45, 55 42, 40 55 Z"
              fill="#E1592A"
              opacity="0.85"
            />
            <path
              d="M110 25 C 90 22, 82 45, 100 55 C 118 65, 140 55, 138 38 C 136 22, 125 18, 110 25 Z"
              fill="#F0A583"
              opacity="0.7"
            />
            <path
              d="M75 100 C 55 95, 45 118, 65 128 C 85 138, 108 128, 105 110 C 103 96, 90 93, 75 100 Z"
              fill="#E1592A"
              opacity="0.6"
            />
          </svg>
          <span className="home-card__arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F2EDE4" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
          <span className="home-card__title font-archivo">Boulder</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(cordaTo)}
          className="home-card home-card--corda"
          aria-label="Vai alla sezione Corda"
        >
          <svg className="home-card__rope" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
            <path className="home-card__rope-path" d="M -10 170 C 60 40, 120 220, 190 90 S 320 30, 410 120" />
          </svg>
          <span className="home-card__arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F2EDE4" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
          <span className="home-card__title font-archivo">Corda</span>
        </button>
      </div>
    </div>
  )
}
