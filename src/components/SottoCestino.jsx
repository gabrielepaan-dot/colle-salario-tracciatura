import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { COLORI_PRESE, sfondoColorePrese, testoPerColorePrese, nomeColorePrese } from '../lib/colori'
import { formattaTempoFa } from '../lib/date'
import Avatar from './Avatar'
import GradoStar from './GradoStar'
import ConfermaDialog from './ConfermaDialog'

const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000
const SFONDO_RIGA_OVERRIDE = { bianco: '#FFFBEB' }

// Sotto-pagina di Cestino, raggiungibile solo da Profilo e solo dagli
// admin (vedi guard sotto). Mostra i blocchi passati per "Elimina
// definitivamente" dal Cestino normale (inSottocestino: true), non ancora
// cancellati per sempre. Ogni apertura fa prima una pulizia: i blocchi qui
// da più di 7 giorni (sottocestinoIl) vengono cancellati per sempre —
// boulder E storico, a differenza della pulizia 7gg del Cestino normale.
export default function SottoCestino({ tracciatoreLoggato }) {
  const navigate = useNavigate()
  const [boulders, setBoulders] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [azioneInCorso, setAzioneInCorso] = useState(null)
  const [confermaEliminazione, setConfermaEliminazione] = useState(null)

  const isAdmin = !!tracciatoreLoggato?.isAdmin

  const eliminaPerSempre = useCallback(async (boulder) => {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'boulder', boulder.id))
    const storicoSnap = await getDocs(query(collection(db, 'storico'), where('boulderId', '==', boulder.id)))
    storicoSnap.forEach((s) => batch.delete(s.ref))
    await batch.commit()
  }, [])

  const carica = useCallback(async () => {
    if (!isAdmin) return
    setCaricamento(true)
    setErrore(null)
    try {
      const q = query(collection(db, 'boulder'), where('inSottocestino', '==', true))
      const snap = await getDocs(q)
      const tutti = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.sottocestinoIl?.toMillis?.() ?? 0) - (a.sottocestinoIl?.toMillis?.() ?? 0))

      const ora = Date.now()
      const daPurgare = tutti.filter((b) => {
        const sottocestinoIlDate = b.sottocestinoIl?.toDate ? b.sottocestinoIl.toDate() : null
        return sottocestinoIlDate && ora - sottocestinoIlDate.getTime() > SETTE_GIORNI_MS
      })
      if (daPurgare.length > 0) {
        await Promise.all(daPurgare.map((b) => eliminaPerSempre(b)))
      }

      const idPurgati = new Set(daPurgare.map((b) => b.id))
      setBoulders(tutti.filter((b) => !idPurgati.has(b.id)))
    } catch (e) {
      setErrore('Connessione assente, riprova.')
      console.error(e)
    }
    setCaricamento(false)
  }, [isAdmin, eliminaPerSempre])

  useEffect(() => {
    carica()
  }, [carica])

  async function ripristina(boulder) {
    setAzioneInCorso(boulder.id)
    setErrore(null)
    try {
      await updateDoc(doc(db, 'boulder', boulder.id), {
        inSottocestino: false,
        sottocestinoIl: null,
        sottocestinoDa: null,
      })
      await carica()
    } catch (e) {
      setErrore('Connessione assente, riprova. Se il problema persiste il ripristino non è andato a buon fine.')
      console.error(e)
    }
    setAzioneInCorso(null)
  }

  async function confermaEliminaPerSempre(boulder) {
    setAzioneInCorso(boulder.id)
    setErrore(null)
    try {
      await eliminaPerSempre(boulder)
      await carica()
    } catch (e) {
      setErrore('Connessione assente, riprova. Se il problema persiste l\'eliminazione non è andata a buon fine.')
      console.error(e)
    }
    setAzioneInCorso(null)
  }

  if (!isAdmin) {
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
          <h1 className="text-lg font-bold text-navy">Recupero admin</h1>
        </header>
        <p className="text-center text-gray-400 text-sm py-10">Sezione riservata agli admin.</p>
      </div>
    )
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
        <h1 className="text-lg font-bold text-navy">Recupero admin</h1>
      </header>

      <p className="text-xs text-gray-400 mb-4">
        Blocchi/vie eliminati definitivamente dal Cestino. Restano recuperabili qui per 7 giorni, poi vengono cancellati per sempre.
      </p>

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
        <p className="text-center text-gray-400 text-sm py-10">Nessun blocco in sotto-cestino.</p>
      )}

      {!caricamento && !errore && boulders.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 divide-y divide-black/10">
          {boulders.map((b) => {
            const sfondoNormale = SFONDO_RIGA_OVERRIDE[b.colorePrese] || COLORI_PRESE[b.colorePrese] || '#374151'
            const sfondo = sfondoColorePrese(b.colorePrese, sfondoNormale)
            const testo = testoPerColorePrese(b.colorePrese, sfondoNormale)
            const testoAttenuato = testo === '#FFFFFF' ? 'rgba(255,255,255,0.75)' : 'rgba(17,17,17,0.65)'
            const desaturato = !!b.old || b.colorePrese === 'giallo_old'
            const inCorso = azioneInCorso === b.id

            return (
              <div
                key={b.id}
                className="flex items-center gap-2 px-3 py-2.5"
                style={{
                  background: sfondo,
                  color: testo,
                  filter: desaturato ? 'saturate(0.62) brightness(1.04)' : undefined,
                  opacity: desaturato ? 0.88 : 1,
                }}
              >
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
                  {nomeColorePrese(b.colorePrese)}
                  {b.old && <span className="font-normal normal-case"> · old</span>}
                </span>

                <GradoStar coloreGrado={b.coloreGrado} size="md" />

                <span className="flex items-center gap-1.5 shrink-0 max-w-[7rem]">
                  <Avatar nome={b.sottocestinoDa} size="sm" />
                  <span className="flex flex-col leading-tight min-w-0">
                    <span className="text-xs truncate" style={{ color: testo }}>
                      {b.sottocestinoDa || 'sconosciuto'}
                    </span>
                    <span className="text-[10px] truncate" style={{ color: testoAttenuato }}>
                      {formattaTempoFa(b.sottocestinoIl)}
                    </span>
                  </span>
                </span>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => ripristina(b)}
                    disabled={inCorso}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-navy disabled:opacity-40"
                  >
                    {inCorso ? '...' : 'Ripristina'}
                  </button>
                  <button
                    onClick={() => setConfermaEliminazione(b)}
                    disabled={inCorso}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white text-rosso disabled:opacity-40"
                  >
                    {inCorso ? '...' : 'Elimina per sempre'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {confermaEliminazione && (
        <ConfermaDialog
          titolo="Eliminare per sempre?"
          messaggio="L'operazione è irreversibile: boulder/via e storico verranno cancellati per sempre da Firestore."
          testoConferma="Elimina per sempre"
          testoInCorso="Eliminazione..."
          inCorso={azioneInCorso === confermaEliminazione.id}
          onAnnulla={() => setConfermaEliminazione(null)}
          onConferma={async () => {
            const boulder = confermaEliminazione
            await confermaEliminaPerSempre(boulder)
            setConfermaEliminazione(null)
          }}
        />
      )}
    </div>
  )
}
