import { useState } from 'react'
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { LISTA_SETTORI, LISTA_COLORI_PRESE, LISTA_COLORI_GRADO, COLORI_PRESE } from '../lib/colori'
import GradoStar from './GradoStar'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

// mode: 'create' | 'update'
// boulderEsistente: { id, settore, colorePrese, coloreGrado, stato, note, dataUltimoCambio } — richiesto se mode === 'update'
// settoreIniziale: string — usato solo se mode === 'create' (settore già scelto, es. da un filtro attivo)
export default function BoulderForm({
  mode,
  boulderEsistente,
  settoreIniziale,
  tracciatoreLoggato,
  tracciatori,
  onClose,
  onSalvato,
}) {
  const [settore, setSettore] = useState(boulderEsistente?.settore || settoreIniziale || LISTA_SETTORI[0])
  const [colorePrese, setColorePrese] = useState(boulderEsistente?.colorePrese || '')
  const [coloreGrado, setColoreGrado] = useState(boulderEsistente?.coloreGrado || '')
  const [note, setNote] = useState(boulderEsistente?.note || '')
  const [dataEvento, setDataEvento] = useState(oggiISO())
  const [tracciatoreId, setTracciatoreId] = useState(tracciatoreLoggato?.id || '')
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState(null)

  // Un boulder nasce sempre attivo; lo stato "non attivo" si ottiene solo
  // rimuovendolo (cestino in Dettaglio settore / Filtri), mai da qui.
  const stato = mode === 'create' ? 'attiva' : boulderEsistente?.stato || 'attiva'

  const valido = settore && colorePrese && coloreGrado && dataEvento && tracciatoreId

  async function handleSalva() {
    if (!valido || salvando) return
    setSalvando(true)
    setErrore(null)

    try {
      const batch = writeBatch(db)
      const tracciatoreNome = tracciatori.find((t) => t.id === tracciatoreId)?.nome || ''

      const snapshot = {
        settore,
        colorePrese,
        coloreGrado,
        stato,
        note: note || null,
        tracciatoreId,
        tracciatoreNome,
        dataUltimoCambio: dataEvento,
      }

      let boulderId = boulderEsistente?.id

      if (mode === 'create') {
        const boulderRef = doc(collection(db, 'boulder'))
        boulderId = boulderRef.id
        batch.set(boulderRef, { ...snapshot, creatoIl: serverTimestamp() })
      } else {
        // Se la data inserita è precedente all'ultimo cambio registrato
        // (correzione/inserimento retroattivo), non sovrascriviamo lo stato
        // "corrente" mostrato in Home — aggiungiamo solo la voce di storico.
        // Evita che una correzione nel passato faccia "tornare indietro"
        // la card rispetto a un evento già più recente.
        const eIlPiuRecente = dataEvento >= (boulderEsistente.dataUltimoCambio || '')
        if (eIlPiuRecente) {
          const boulderRef = doc(db, 'boulder', boulderId)
          batch.update(boulderRef, snapshot)
        }
      }

      const storicoRef = doc(collection(db, 'storico'))
      batch.set(storicoRef, {
        boulderId,
        settore,
        tracciatoreId,
        tracciatoreNome,
        eseguitoDaUid: auth.currentUser?.uid || null,
        eseguitoDaNome: tracciatoreLoggato?.nome || null,
        dataEvento,
        colorePrese,
        coloreGrado,
        stato,
        note: note || null,
        creatoIl: serverTimestamp(),
      })

      await batch.commit()
      onSalvato()
    } catch {
      setErrore('Connessione assente, riprova. Se il problema persiste il salvataggio non è andato a buon fine.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy">
            {mode === 'create' ? 'Nuovo boulder' : 'Aggiorna boulder'}
          </h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {/* Settore — solo in creazione, non modificabile in aggiornamento */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Settore</p>
          {mode === 'create' ? (
            <div className="grid grid-cols-2 gap-2">
              {LISTA_SETTORI.map((s) => (
                <button
                  key={s}
                  onClick={() => setSettore(s)}
                  className={`px-3 py-2 rounded-lg text-sm border text-left ${
                    settore === s ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-700">{settore}</p>
          )}
        </div>

        {/* Colore prese */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Colore prese</p>
          <div className="grid grid-cols-3 gap-2">
            {LISTA_COLORI_PRESE.map((c) => {
              const attivo = colorePrese === c
              return (
                <button
                  key={c}
                  onClick={() => setColorePrese(c)}
                  className="px-2 py-2 rounded-lg text-xs font-medium border capitalize"
                  style={{
                    backgroundColor: attivo ? COLORI_PRESE[c] : 'white',
                    color: attivo ? 'white' : COLORI_PRESE[c],
                    borderColor: COLORI_PRESE[c],
                  }}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* Colore grado */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Grado (facile → difficile)</p>
          <div className="flex flex-wrap gap-2">
            {LISTA_COLORI_GRADO.map((g) => {
              const attivo = coloreGrado === g
              return (
                <button
                  key={g}
                  onClick={() => setColoreGrado(g)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border capitalize ${
                    attivo ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  <GradoStar coloreGrado={g} size="sm" />
                  {g}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tracciatore attribuito */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Tracciatore</p>
          <div className="flex flex-wrap gap-2">
            {tracciatori.map((t) => (
              <button
                key={t.id}
                onClick={() => setTracciatoreId(t.id)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  tracciatoreId === t.id ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
                }`}
              >
                {t.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Data */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Data</p>
          <input
            type="date"
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          />
        </div>

        {/* Note */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Note (facoltative)</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            placeholder="es. dx, sx — solo se serve distinguere boulder simili"
          />
        </div>

        {errore && <p className="text-rosso text-sm mb-3">{errore}</p>}

        <button
          onClick={handleSalva}
          disabled={!valido || salvando}
          className="w-full py-3 rounded-xl bg-navy text-white font-medium disabled:opacity-40"
        >
          {salvando ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
