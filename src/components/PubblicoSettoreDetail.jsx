import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePubblicoSnapshot } from '../lib/pubblicoSnapshot'
import BoulderRow from './BoulderRow'

// Equivalente pubblico/sola-lettura di SettoreDetail.jsx: stessa struttura
// (chip Ordina, tabella BoulderRow), ma alimentato dallo snapshot JSON
// statico e filtrato per settore lato client, senza query Firestore.
// Nessun filtro Grado/Tracciatore qui (al massimo una decina di blocchi/vie
// per settore, non serve).
export default function PubblicoSettoreDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const settore = decodeURIComponent(slug)

  const { dati, caricamento, errore, ricarica } = usePubblicoSnapshot()
  const [ordine, setOrdine] = useState('desc')

  const boulders = useMemo(() => {
    const elenco = (dati?.boulder || []).filter((b) => b.settore === settore)
    return [...elenco].sort((a, b) =>
      ordine === 'asc'
        ? a.dataUltimoCambio.localeCompare(b.dataUltimoCambio)
        : b.dataUltimoCambio.localeCompare(a.dataUltimoCambio)
    )
  }, [dati, settore, ordine])

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/pubblico')}
          className="text-navy text-xl leading-none shrink-0"
          aria-label="Torna alla Home"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-navy truncate">{settore}</h1>
      </header>

      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Ordina per data</p>
        <div className="flex gap-2">
          <button
            onClick={() => setOrdine('desc')}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              ordine === 'desc' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
            }`}
          >
            Più recenti
          </button>
          <button
            onClick={() => setOrdine('asc')}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              ordine === 'asc' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
            }`}
          >
            Meno recenti
          </button>
        </div>
      </div>

      {caricamento && <p className="text-center text-gray-400 text-sm py-10">Caricamento...</p>}

      {errore && (
        <div className="text-center py-10">
          <p className="text-rosso text-sm mb-3">{errore}</p>
          <button onClick={ricarica} className="px-4 py-2 rounded-lg bg-navy text-white text-sm">
            Riprova
          </button>
        </div>
      )}

      {!caricamento && !errore && boulders.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-10">
          Nessun boulder tracciato in questo settore.
        </p>
      )}

      {!caricamento && !errore && boulders.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 divide-y divide-black/10">
          {boulders.map((b, i) => (
            <BoulderRow key={i} boulder={b} cliccabile={false} mostraCestino={false} />
          ))}
        </div>
      )}
    </div>
  )
}
