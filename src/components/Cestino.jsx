import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { COLORI_PRESE, testoLeggibileSu } from '../lib/colori'
import { formattaTempoFa, giorniTra } from '../lib/date'
import Avatar from './Avatar'
import GradoStar from './GradoStar'
import ConfermaDialog from './ConfermaDialog'

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000
const SFONDO_RIGA_OVERRIDE = { bianco: '#FFFBEB' }

// Pagina raggiungibile solo da Profilo. Ogni apertura fa prima una pulizia:
// i blocchi rimossi da più di 7 giorni vengono eliminati per sempre da
// Firestore (nessuna Cloud Function, tutto qui lato client, storico non
// toccato), poi si mostra la lista di quello che resta nel cestino.
export default function Cestino({ tracciatoreLoggato }) {
  const navigate = useNavigate()
  const [boulders, setBoulders] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [azioneInCorso, setAzioneInCorso] = useState(null)
  const [confermaEliminazione, setConfermaEliminazione] = useState(null)

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
      await updateDoc(doc(db, 'boulder', boulder.id), {
        stato: 'attiva',
        rimossoDa: null,
        rimossoDaNome: null,
        rimossoIl: null,
      })
      await carica()
    } catch (e) {
      setErrore('Connessione assente, riprova. Se il problema persiste il ripristino non è andato a buon fine.')
      console.error(e)
    }
    setAzioneInCorso(null)
  }

  async function eliminaDefinitivamente(boulder) {
    setAzioneInCorso(boulder.id)
    setErrore(null)
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'boulder', boulder.id))
      const storicoSnap = await getDocs(query(collection(db, 'storico'), where('boulderId', '==', boulder.id)))
      storicoSnap.forEach((s) => batch.delete(s.ref))
      await batch.commit()
      await carica()
    } catch (e) {
      setErrore('Connessione assente, riprova. Se il problema persiste l\'eliminazione non è andata a buon fine.')
      console.error(e)
    }
    setAzioneInCorso(null)
  }

  function richiediEliminazioneDefinitiva(boulder) {
    const giorni = giorniTra(boulder.creatoIl, boulder.rimossoIl)
    if (giorni === null || giorni >= 7) {
      setConfermaEliminazione(boulder)
    } else {
      eliminaDefinitivamente(boulder)
    }
  }

  const giorniInParete = confermaEliminazione
    ? giorniTra(confermaEliminazione.creatoIl, confermaEliminazione.rimossoIl)
    : null

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
        <div className="rounded-2xl overflow-hidden border border-gray-200 divide-y divide-black/10">
          {boulders.map((b) => {
            const sfondo = SFONDO_RIGA_OVERRIDE[b.colorePrese] || COLORI_PRESE[b.colorePrese] || '#374151'
            const testo = testoLeggibileSu(sfondo)
            const testoAttenuato = testo === '#FFFFFF' ? 'rgba(255,255,255,0.75)' : 'rgba(17,17,17,0.65)'
            const inCorso = azioneInCorso === b.id

            return (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: sfondo, color: testo }}>
                <span className="flex flex-col gap-0.5 shrink-0 w-14 min-w-0">
                  <span
                    className="text-[8px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded-full border w-fit"
                    style={{ borderColor: testoAttenuato, color: testoAttenuato }}
                  >
                    {b.tipo === 'corda' ? 'Corda' : 'Boulder'}
                  </span>
                  <span className="text-[10px] truncate" style={{ color: testoAttenuato }}>
                    {b.settore}
                  </span>
                </span>

                <span className="font-bold uppercase text-xs tracking-wide truncate flex-1 min-w-0">
                  {b.colorePrese}
                </span>

                <GradoStar coloreGrado={b.coloreGrado} size="md" />

                <span className="flex items-center gap-1.5 shrink-0 max-w-[7rem]">
                  <Avatar nome={b.rimossoDaNome} size="sm" />
                  <span className="flex flex-col leading-tight min-w-0">
                    <span className="text-xs truncate" style={{ color: testo }}>
                      {b.rimossoDaNome || 'sconosciuto'}
                    </span>
                    <span className="text-[10px] truncate" style={{ color: testoAttenuato }}>
                      {formattaTempoFa(b.rimossoIl)}
                    </span>
                  </span>
                </span>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => ripristina(b)}
                    disabled={inCorso || !tracciatoreLoggato}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-navy disabled:opacity-40"
                  >
                    {inCorso ? '...' : 'Ripristina'}
                  </button>
                  <button
                    onClick={() => richiediEliminazioneDefinitiva(b)}
                    disabled={inCorso || !tracciatoreLoggato}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-rosso disabled:opacity-40"
                  >
                    {inCorso ? '...' : 'Elimina'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confermaEliminazione && (
        <ConfermaDialog
          titolo="Eliminare definitivamente?"
          messaggio={`Questo blocco è stato in parete ${giorniInParete === null ? 'da molto tempo' : `${giorniInParete} giorni`} — eliminarlo rimuoverà anche le statistiche associate. Confermi?`}
          testoConferma="Elimina definitivamente"
          testoInCorso="Eliminazione..."
          inCorso={azioneInCorso === confermaEliminazione.id}
          onAnnulla={() => setConfermaEliminazione(null)}
          onConferma={async () => {
            const boulder = confermaEliminazione
            await eliminaDefinitivamente(boulder)
            setConfermaEliminazione(null)
          }}
        />
      )}
    </div>
  )
}
