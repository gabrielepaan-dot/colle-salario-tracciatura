import { useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { scaricaCsv } from '../lib/csv'

const OGGI = () => new Date().toISOString().slice(0, 10)

export default function ExportCsv() {
  const [caricamento, setCaricamento] = useState(null) // 'attivi' | 'storico' | null
  const [errore, setErrore] = useState(null)

  async function esportaBoulderAttivi() {
    setCaricamento('attivi')
    setErrore(null)
    try {
      const q = query(collection(db, 'boulder'), where('stato', '==', 'attiva'))
      const snap = await getDocs(q)
      const righe = snap.docs
        .map((d) => d.data())
        .sort((a, b) => a.settore.localeCompare(b.settore))

      scaricaCsv(
        `boulder-attivi-${OGGI()}.csv`,
        [
          { key: 'settore', label: 'Settore' },
          { key: 'colorePrese', label: 'Colore prese' },
          { key: 'coloreGrado', label: 'Colore grado' },
          { key: 'tracciatoreNome', label: 'Tracciatore' },
          { key: 'dataUltimoCambio', label: 'Data ultimo cambio' },
          { key: 'note', label: 'Note' },
        ],
        righe
      )
    } catch {
      setErrore('Connessione assente, riprova.')
    }
    setCaricamento(null)
  }

  async function esportaStoricoCompleto() {
    setCaricamento('storico')
    setErrore(null)
    try {
      const q = query(collection(db, 'storico'), orderBy('dataEvento'))
      const snap = await getDocs(q)
      const righe = snap.docs.map((d) => d.data())

      scaricaCsv(
        `storico-boulder-${OGGI()}.csv`,
        [
          { key: 'dataEvento', label: 'Data' },
          { key: 'settore', label: 'Settore' },
          { key: 'colorePrese', label: 'Colore prese' },
          { key: 'coloreGrado', label: 'Colore grado' },
          { key: 'stato', label: 'Stato' },
          { key: 'tracciatoreNome', label: 'Tracciatore' },
          { key: 'eseguitoDaNome', label: 'Inserito da' },
          { key: 'note', label: 'Note' },
        ],
        righe
      )
    } catch {
      setErrore('Connessione assente, riprova.')
    }
    setCaricamento(null)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <h2 className="font-bold text-navy text-sm mb-1">Esporta CSV</h2>
      <p className="text-xs text-gray-400 mb-3">Solo admin — backup compatibile Excel/Google Sheets</p>

      <div className="flex flex-col gap-2">
        <button
          onClick={esportaBoulderAttivi}
          disabled={caricamento !== null}
          className="py-2 rounded-lg border border-navy text-navy text-sm font-medium disabled:opacity-40"
        >
          {caricamento === 'attivi' ? 'Preparazione...' : 'Esporta boulder attivi'}
        </button>
        <button
          onClick={esportaStoricoCompleto}
          disabled={caricamento !== null}
          className="py-2 rounded-lg border border-navy text-navy text-sm font-medium disabled:opacity-40"
        >
          {caricamento === 'storico' ? 'Preparazione...' : 'Esporta storico completo'}
        </button>
      </div>

      {errore && <p className="text-rosso text-sm mt-3">{errore}</p>}
    </div>
  )
}
