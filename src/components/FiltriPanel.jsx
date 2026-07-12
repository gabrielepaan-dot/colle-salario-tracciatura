import { LISTA_SETTORI, LISTA_COLORI_PRESE, COLORI_PRESE } from '../lib/colori'

// Chip "a togglabile singolo": ricliccando lo stesso chip selezionato, si
// deseleziona (torna a "tutti"). Coerente con l'uso rapido da mobile
// richiesto (niente dropdown).
export default function FiltriPanel({ filtri, setFiltri, tracciatori, tracciatoreLoggato }) {
  function toggleSettore(settore) {
    setFiltri((f) => ({ ...f, settore: f.settore === settore ? null : settore }))
  }

  function toggleColore(colore) {
    setFiltri((f) => ({ ...f, colorePrese: f.colorePrese === colore ? null : colore }))
  }

  function toggleTracciatore(id) {
    setFiltri((f) => ({ ...f, tracciatoreId: f.tracciatoreId === id ? null : id }))
  }

  function haFiltriAttivi() {
    return filtri.settore || filtri.colorePrese || filtri.tracciatoreId
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-navy text-sm">Filtri</h2>
        {haFiltriAttivi() && (
          <button
            onClick={() => setFiltri({ settore: null, colorePrese: null, tracciatoreId: null, ordine: filtri.ordine })}
            className="text-xs text-gray-400 underline"
          >
            Azzera
          </button>
        )}
      </div>

      {/* Ordinamento */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Ordina per data</p>
        <div className="flex gap-2">
          <button
            onClick={() => setFiltri((f) => ({ ...f, ordine: 'desc' }))}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filtri.ordine === 'desc' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
            }`}
          >
            Più recenti
          </button>
          <button
            onClick={() => setFiltri((f) => ({ ...f, ordine: 'asc' }))}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filtri.ordine === 'asc' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
            }`}
          >
            Meno recenti
          </button>
        </div>
      </div>

      {/* Settore */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Settore</p>
        <div className="grid grid-cols-2 gap-2">
          {LISTA_SETTORI.map((settore) => (
            <button
              key={settore}
              onClick={() => toggleSettore(settore)}
              className={`px-3 py-2 rounded-lg text-sm border text-left ${
                filtri.settore === settore
                  ? 'bg-navy text-white border-navy'
                  : 'border-gray-200 text-gray-700'
              }`}
            >
              {settore}
            </button>
          ))}
        </div>
      </div>

      {/* Colore prese */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Colore prese</p>
        <div className="grid grid-cols-3 gap-2">
          {LISTA_COLORI_PRESE.map((colore) => {
            const attivo = filtri.colorePrese === colore
            return (
              <button
                key={colore}
                onClick={() => toggleColore(colore)}
                className="px-2 py-2 rounded-lg text-xs font-medium border capitalize"
                style={{
                  backgroundColor: attivo ? COLORI_PRESE[colore] : 'white',
                  color: attivo ? 'white' : COLORI_PRESE[colore],
                  borderColor: COLORI_PRESE[colore],
                }}
              >
                {colore}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tracciatore */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Tracciatore</p>
        <div className="flex flex-wrap gap-2">
          {tracciatoreLoggato && (
            <button
              onClick={() => toggleTracciatore(tracciatoreLoggato.id)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                filtri.tracciatoreId === tracciatoreLoggato.id
                  ? 'bg-navy text-white border-navy'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              Solo i miei
            </button>
          )}
          {tracciatori
            .filter((t) => !tracciatoreLoggato || t.id !== tracciatoreLoggato.id)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTracciatore(t.id)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  filtri.tracciatoreId === t.id
                    ? 'bg-navy text-white border-navy'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {t.nome}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
