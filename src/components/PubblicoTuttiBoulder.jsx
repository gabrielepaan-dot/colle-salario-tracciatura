import { useState, useMemo } from 'react'
import { usePubblicoSnapshot } from '../lib/pubblicoSnapshot'
import { ORDINE_GRADI } from '../lib/colori'
import BoulderRow from './BoulderRow'

// Equivalente pubblico/sola-lettura di TuttiBoulder.jsx: stessa struttura
// (chip Tipo/Ordina, tabella BoulderRow), ma alimentato dallo snapshot JSON
// statico invece che da Firestore, e con due filtri in più (Grado,
// Tracciatore) mutuamente esclusivi. Componente separato — non un refactor
// di TuttiBoulder.jsx — per non toccare il file usato ogni giorno dai
// tracciatori per la tracciatura reale.
export default function PubblicoTuttiBoulder() {
  const { dati, caricamento, errore, ricarica } = usePubblicoSnapshot()
  const [tipoAttivo, setTipoAttivo] = useState('boulder')
  // Default inverso rispetto all'app interna (che ha "meno recenti prima"):
  // qui il pubblico vede prima le novità.
  const [ordine, setOrdine] = useState('desc')
  const [gradoFiltro, setGradoFiltro] = useState('')
  const [tracciatoreFiltro, setTracciatoreFiltro] = useState('')

  const perTipo = useMemo(
    () => (dati?.boulder || []).filter((b) => b.tipo === tipoAttivo),
    [dati, tipoAttivo]
  )

  const tracciatoriDisponibili = useMemo(() => {
    const nomi = new Set(perTipo.map((b) => b.tracciatoreNome).filter(Boolean))
    return Array.from(nomi).sort((a, b) => a.localeCompare(b))
  }, [perTipo])

  const boulders = useMemo(() => {
    let elenco = perTipo
    if (gradoFiltro) elenco = elenco.filter((b) => b.coloreGrado === gradoFiltro)
    else if (tracciatoreFiltro) elenco = elenco.filter((b) => b.tracciatoreNome === tracciatoreFiltro)

    return [...elenco].sort((a, b) =>
      ordine === 'asc'
        ? a.dataUltimoCambio.localeCompare(b.dataUltimoCambio)
        : b.dataUltimoCambio.localeCompare(a.dataUltimoCambio)
    )
  }, [perTipo, gradoFiltro, tracciatoreFiltro, ordine])

  function selezionaGrado(valore) {
    setGradoFiltro(valore)
    if (valore) setTracciatoreFiltro('')
  }

  function selezionaTracciatore(valore) {
    setTracciatoreFiltro(valore)
    if (valore) setGradoFiltro('')
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="flex items-center gap-3 mb-4">
        <img src="/colle-salario-tracciatura/logo.svg" alt="" className="w-9 h-9" />
        <h1 className="text-lg font-bold text-navy">Tutti i boulder e le vie</h1>
      </header>

      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Tipo</p>
        <div className="flex gap-2">
          <button
            onClick={() => setTipoAttivo('boulder')}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              tipoAttivo === 'boulder' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
            }`}
          >
            Boulder
          </button>
          <button
            onClick={() => setTipoAttivo('corda')}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              tipoAttivo === 'corda' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
            }`}
          >
            Corda
          </button>
        </div>
      </div>

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

      {/* Grado e Tracciatore sono filtri alternativi, non cumulativi: */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-2">Grado</p>
          <select
            value={gradoFiltro}
            onChange={(e) => selezionaGrado(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white capitalize"
          >
            <option value="">Tutti</option>
            {ORDINE_GRADI.map((g) => (
              <option key={g} value={g} className="capitalize">
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-2">Tracciatore</p>
          <select
            value={tracciatoreFiltro}
            onChange={(e) => selezionaTracciatore(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="">Tutti</option>
            {tracciatoriDisponibili.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
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
        <p className="text-center text-gray-400 text-sm py-10">Nessun boulder tracciato ancora.</p>
      )}

      {!caricamento && !errore && boulders.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 divide-y divide-black/10">
          {boulders.map((b, i) => (
            <BoulderRow key={i} boulder={b} mostraSettore cliccabile={false} mostraCestino={false} />
          ))}
        </div>
      )}
    </div>
  )
}
