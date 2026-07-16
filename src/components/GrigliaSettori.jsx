import { useNavigate } from 'react-router-dom'
import { LISTA_SETTORI, LISTA_SETTORI_CORDA } from '../lib/colori'

// tipo: 'boulder' | 'corda'
// backTo/settorePathBase: personalizzano le destinazioni di navigazione così
// questo componente è riusabile invariato anche dalla Vista pubblica
// (#/pubblico/boulder, #/pubblico/corda), che vive sotto un prefisso diverso
// dall'app autenticata.
export default function GrigliaSettori({ tipo, backTo = '/', settorePathBase = '/settore' }) {
  const navigate = useNavigate()
  const lista = tipo === 'corda' ? LISTA_SETTORI_CORDA : LISTA_SETTORI
  const titolo = tipo === 'corda' ? 'Corda' : 'Boulder'

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(backTo)}
          className="text-navy text-xl leading-none shrink-0"
          aria-label="Torna alla scelta Boulder/Corda"
        >
          ←
        </button>
        <img src="/colle-salario-tracciatura/logo.svg" alt="" className="w-9 h-9" />
        <h1 className="text-lg font-bold text-navy">{titolo}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {lista.map((settore) => (
          <button
            key={settore}
            onClick={() => navigate(`${settorePathBase}/${encodeURIComponent(settore)}`)}
            className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-5 text-left text-sm font-semibold text-navy hover:bg-gray-50"
          >
            {settore}
          </button>
        ))}
      </div>
    </div>
  )
}
