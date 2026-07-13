import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { COLORI_PRESE } from '../lib/colori'
import { formattaTempoFa } from '../lib/date'

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000

// Pagina raggiungibile solo da Profilo. Ogni apertura fa prima una pulizia:
// i blocchi rimossi da più di 7 giorni vengono eliminati per sempre da
// Firestore (nessuna Cloud Function, tutto qui lato client), poi si mostra
// la lista di quello che resta nel cestino.
export default function Cestino({ tracciatoreLoggato }) {
  const navigate = useNavigate()
  const [boulders, setBoulders] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [azioneInCorso, setAzioneInCorso] = useState(null)

  const carica = useCallback(async () => {
    setCaricamento(true)
    setErrore(null)
    try {
      // Niente orderBy nella query: eviterebbe di dover creare un indice
      // composito manuale su Firebase. Per una lista così piccola ordinare
      // qui in JS non ha alcun impatto pratico.
      const q = query(collection(db, 'boulder'), where('stato', '==', 'rimossa'))
      const snap = await getDocs(q)
      const tutti = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.rimossoIl?.toMillis?.() ?? 0) - (a.rimossoIl?.toMillis?.() ?? 0))

      const ora = Date.now()
      const daPurgare = tutti.filter((b) => {
        const rimossoIlDate = b.rimossoIl?.toDate ? b.rimossoIl.toDate() : null
        return rimossoIlDate && ora - rimossoIlDate.getTime() > SETTE_GIORNI_MS
      })
      if (daPurgare.length > 0) {
        const batch = writeBatch(db)
        daPurgare.forEach((b) => batch.delete(doc(db, 'boulder', b.id)))
        await batch.commit()
      }

      const idPurgati = new Set(daPurgare.map((b) => b.id))
      setBoulders(tutti.filter((b) => !idPurgati.has(b.id)))
    } catch (e) {
      setErrore('Connessione assente, riprova.')
      console.error(e)
    }
    setCaricamento(false)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  async function ripristina(boulder) {
    setAzioneInCorso(boulder.id)
    setErrore(null)
    try {
      await updateDoc(doc(db, 'boulder', boulder.id), { stato: 'attiva', rimossoDa: null, rimossoIl: null })
      await carica()
    } catch (e) {
      setErrore('Connessione assente, riprova. Se il problema persiste il ripristino non è andato a buon fine.')
      console.error(e)
    }
    setAzioneInCorso(null)
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/')}
          className="text-navy text-xl leading-none shrink-0"
          aria-label="Torna al Profilo"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-navy">Cestino</h1>
      </header>

      {caricamento && <p className="text-center text-gray-400 text-sm py-10">Caricamento...</p>}

      {errore && (
        <div className="text-center py-10">
          <p className="text-rosso text-sm mb-3">{errore}</p>
          <button onClick={carica} className="px-4 py-2 rounded-lg bg-navy text-white text-sm">
            Riprova
          </button>
        </div>
      )}

      {!caricamento && !errore && boulders.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-10">Il cestino è vuoto.</p>
      )}

      {!caricamento && !errore && boulders.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 divide-y divide-gray-100 bg-white">
          {boulders.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                style={{ backgroundColor: COLORI_PRESE[b.colorePrese] || '#9CA3AF' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  <span className="capitalize">{b.colorePrese}</span> — {b.settore}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  Rimosso da {b.rimossoDa || 'sconosciuto'} · {formattaTempoFa(b.rimossoIl)}
                </p>
              </div>
              <button
                onClick={() => ripristina(b)}
                disabled={azioneInCorso === b.id || !tracciatoreLoggato}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-navy text-navy disabled:opacity-40"
              >
                {azioneInCorso === b.id ? '...' : 'Ripristina'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
