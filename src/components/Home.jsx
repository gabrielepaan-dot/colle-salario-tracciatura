import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import BoulderCard from './BoulderCard'
import FiltriPanel from './FiltriPanel'
import BoulderForm from './BoulderForm'

const FILTRI_INIZIALI = { settore: null, colorePrese: null, tracciatoreId: null, ordine: 'desc' }

export default function Home({ tracciatoreLoggato, mostraFiltri, setMostraFiltri }) {
  const [boulders, setBoulders] = useState([])
  const [tracciatori, setTracciatori] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [filtri, setFiltri] = useState(FILTRI_INIZIALI)
  const [formAperto, setFormAperto] = useState(null) // null | { mode: 'create' | 'update', boulderEsistente? }

  const carica = useCallback(async () => {
    setCaricamento(true)
    setErrore(null)
    try {
      const vincoli = []
      if (filtri.settore) vincoli.push(where('settore', '==', filtri.settore))
      if (filtri.colorePrese) vincoli.push(where('colorePrese', '==', filtri.colorePrese))
      if (filtri.tracciatoreId) vincoli.push(where('tracciatoreId', '==', filtri.tracciatoreId))
      vincoli.push(orderBy('dataUltimoCambio', filtri.ordine))

      const q = query(collection(db, 'boulder'), ...vincoli)
      const snap = await getDocs(q)
      setBoulders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (e) {
      // Il caso più comune la prima volta che si prova una nuova combinazione
      // di filtri: Firestore richiede un indice composito dedicato. L'errore
      // reale (in console) contiene un link diretto per crearlo in un click.
      setErrore('Connessione assente, riprova.')
      console.error(e)
    }
    setCaricamento(false)
  }, [filtri])

  useEffect(() => {
    carica()
  }, [carica])

  useEffect(() => {
    // Lista tracciatori per il filtro — caricata una sola volta
    async function caricaTracciatori() {
      try {
        const snap = await getDocs(collection(db, 'tracciatori'))
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        lista.sort((a, b) => a.nome.localeCompare(b.nome))
        setTracciatori(lista)
      } catch {
        // non blocca la Home se fallisce solo questo
      }
    }
    caricaTracciatori()
  }, [])

  const filtriAttivi = filtri.settore || filtri.colorePrese || filtri.tracciatoreId

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <img src="/colle-salario-tracciatura/logo.svg" alt="" className="w-9 h-9" />
          <h1 className="text-lg font-bold text-navy">Boulder attivi</h1>
        </div>
        <div className="flex items-center gap-2">
          {tracciatoreLoggato && (
            <button
              onClick={() => setFormAperto({ mode: 'create' })}
              className="px-3 py-1.5 rounded-full text-sm bg-navy text-white"
            >
              + Nuovo
            </button>
          )}
          <button
            onClick={() => setMostraFiltri((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-1 ${
              filtriAttivi ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
            }`}
          >
            Filtri {filtriAttivi ? '●' : ''}
          </button>
        </div>
      </header>

      {mostraFiltri && (
        <FiltriPanel
          filtri={filtri}
          setFiltri={setFiltri}
          tracciatori={tracciatori}
          tracciatoreLoggato={tracciatoreLoggato}
        />
      )}

      {caricamento && (
        <p className="text-center text-gray-400 text-sm py-10">Caricamento...</p>
      )}

      {errore && (
        <div className="text-center py-10">
          <p className="text-rosso text-sm mb-3">{errore}</p>
          <button onClick={carica} className="px-4 py-2 rounded-lg bg-navy text-white text-sm">
            Riprova
          </button>
        </div>
      )}

      {!caricamento && !errore && boulders.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-10">
          Nessun boulder trovato{filtriAttivi ? ' con questi filtri.' : ' ancora tracciato.'}
        </p>
      )}

      {!caricamento && !errore && boulders.length > 0 && (
        <div className="flex flex-col gap-3">
          {boulders.map((b) => (
            <BoulderCard
              key={b.id}
              boulder={b}
              tracciatoreLoggato={tracciatoreLoggato}
              onAggiorna={(boulder) => setFormAperto({ mode: 'update', boulderEsistente: boulder })}
            />
          ))}
        </div>
      )}

      {formAperto && (
        <BoulderForm
          mode={formAperto.mode}
          boulderEsistente={formAperto.boulderEsistente}
          settoreIniziale={filtri.settore}
          tracciatoreLoggato={tracciatoreLoggato}
          tracciatori={tracciatori}
          onClose={() => setFormAperto(null)}
          onSalvato={() => {
            setFormAperto(null)
            carica()
          }}
        />
      )}
    </div>
  )
}
