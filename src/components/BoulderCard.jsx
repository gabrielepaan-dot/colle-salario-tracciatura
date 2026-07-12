import Avatar from './Avatar'
import { COLORI_PRESE, COLORI_GRADO } from '../lib/colori'
import { giorniFa, formattaData } from '../lib/date'

export default function BoulderCard({ boulder, tracciatoreLoggato, onAggiorna }) {
  const {
    settore,
    colorePrese,
    coloreGrado,
    stato,
    note,
    dataUltimoCambio,
    tracciatoreNome,
  } = boulder

  const coloreTesto = COLORI_PRESE[colorePrese] || '#374151'
  const coloreGradoDot = COLORI_GRADO[coloreGrado] || '#374151'

  return (
    <div className={`rounded-2xl bg-white border border-gray-200 shadow-sm p-4 ${stato === 'vuota' ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3 h-3 rounded-full border border-black/10 shrink-0"
            style={{ backgroundColor: coloreGradoDot }}
            title={`Grado: ${coloreGrado}`}
          />
          <span
            className="font-bold uppercase tracking-wide truncate"
            style={{ color: coloreTesto }}
          >
            {colorePrese}
          </span>
        </div>

        {stato === 'vuota' && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full shrink-0">
            vuoto
          </span>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-1">{settore}</p>

      {note && (
        <p className="text-sm text-gray-600 mt-2 italic">{note}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Avatar nome={tracciatoreNome} size="sm" />
          <span className="text-sm text-gray-700">{tracciatoreNome}</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{formattaData(dataUltimoCambio)}</p>
          <p className="text-xs text-gray-400">{giorniFa(dataUltimoCambio)}</p>
        </div>
      </div>

      {tracciatoreLoggato && (
        <button
          onClick={() => onAggiorna(boulder)}
          className="w-full mt-3 py-2 rounded-lg border border-navy text-navy text-sm font-medium"
        >
          Aggiorna
        </button>
      )}
    </div>
  )
}
