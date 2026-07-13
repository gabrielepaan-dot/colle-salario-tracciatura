import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import BoulderRow from './BoulderRow'
import BoulderForm from './BoulderForm'
import ConfermaDialog from './ConfermaDialog'
import Toast from './Toast'
import { useCancellazioneBoulder } from '../lib/useCancellazioneBoulder'

export default function TuttiBoulder({ tracciatoreLoggato }) {
  const [boulders, setBoulders] = useState([])
  const [tracciatori, setTracciatori] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [ordine, setOrdine] = useState('asc')
  const [formAperto, setFormAperto] = useState(null)

  const carica = useCallback(async () => {
    setCaricamento(true)
    setErrore(null)
    try {
      const q = query(
        collection(db, 'boulder'),
        where('stato', '==', 'attiva'),
        orderBy('dataUltimoCambio', ordine)
      )
      const snap = await getDocs(q)
      setBoulders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (e) {
      setErrore('Connessione assente, riprova.')
      console.error(e)
    }
    setCaricamento(false)
  }, [ordine])

  const { daEliminare, inAttesaAnnulla, erroreEliminazione, richiediEliminazione, annulla, conferma, annullaEliminazione } =
    useCancellazioneBoulder(() => carica(), tracciatoreLoggato)

  useEffect(() => {
    carica()
  }, [carica])

  useEffect(() => {
    async function caricaTracciatori() {
      try {
        const snap = await getDocs(collection(db, 'tracciatori'))
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        lista.sort((a, b) => a.nome.localeCompare(b.nome))
        setTracciatori(lista)
      } catch {
        // non blocca la pagina se fallisce solo questo
      }
    }
    caricaTracciatori()
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <img src="/colle-salario-tracciatura/logo.svg" alt="" className="w-9 h-9" />
          <h1 className="text-lg font-bold text-navy">Tutti i boulder</h1>
        </div>
        {tracciatoreLoggato && (
          <button
            onClick={() => setFormAperto({ mode: 'create' })}
            className="px-3 py-1.5 rounded-full text-sm bg-navy text-white"
          >
            + Nuovo
          </button>
        )}
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
        <p className="text-center text-gray-400 text-sm py-10">Nessun boulder tracciato ancora.</p>
      )}

      {!caricamento && !errore && boulders.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 divide-y divide-black/10">
          {boulders.filter((b) => b.id !== inAttesaAnnulla?.id).map((b) => (
            <BoulderRow
              key={b.id}
              boulder={b}
              mostraSettore
              cliccabile={!!tracciatoreLoggato}
              onClick={() => setFormAperto({ mode: 'update', boulderEsistente: b })}
              mostraCestino={!!tracciatoreLoggato}
              onElimina={() => richiediEliminazione(b)}
            />
          ))}
        </div>
      )}

      {erroreEliminazione && (
        <p className="text-rosso text-sm mt-3 text-center">{erroreEliminazione}</p>
      )}

      {daEliminare && (
        <ConfermaDialog
          titolo="Rimuovere questo boulder?"
          messaggio={`"${daEliminare.colorePrese}" — ${daEliminare.settore}. L'azione non è reversibile dall'app.`}
          onAnnulla={annulla}
          onConferma={conferma}
        />
      )}

      {inAttesaAnnulla && (
        <Toast messaggio="Blocco eliminato" testoAzione="Annulla" onAzione={annullaEliminazione} />
      )}

      {formAperto && (
        <BoulderForm
          mode={formAperto.mode}
          boulderEsistente={formAperto.boulderEsistente}
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
