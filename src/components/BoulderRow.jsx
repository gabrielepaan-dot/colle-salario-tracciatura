import Avatar from './Avatar'
import GradoStar from './GradoStar'
import { COLORI_PRESE, testoLeggibileSu } from '../lib/colori'
import { formattaDataCompatta, giorniFaCompatto } from '../lib/date'

// Riga densa "stile Excel" condivisa da Dettaglio settore e dalla vista
// Filtri: l'intero sfondo è il vero colore prese del boulder, con testo
// chiaro/scuro scelto per contrasto (non sempre "chiaro": alcuni gialli/
// arancioni leggono meglio con testo scuro pur essendo colori "di brand"
// pieni). mostraSettore aggiunge la colonna Settore, necessaria solo nella
// vista Filtri dove i boulder arrivano da pareti diverse.
export default function BoulderRow({ boulder, mostraSettore, cliccabile, onClick, mostraCestino, onElimina }) {
  const { settore, colorePrese, coloreGrado, tracciatoreNome, dataUltimoCambio } = boulder

  const sfondo = COLORI_PRESE[colorePrese] || '#374151'
  const testo = testoLeggibileSu(sfondo)
  const testoAttenuato = testo === '#FFFFFF' ? 'rgba(255,255,255,0.75)' : 'rgba(17,17,17,0.65)'

  return (
    <div
      role={cliccabile ? 'button' : undefined}
      tabIndex={cliccabile ? 0 : undefined}
      onClick={cliccabile ? onClick : undefined}
      onKeyDown={
        cliccabile
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
      className={`flex items-center gap-2 px-3 py-2.5 ${cliccabile ? 'cursor-pointer active:opacity-80' : ''}`}
      style={{ backgroundColor: sfondo, color: testo }}
    >
      {mostraSettore && (
        <span className="text-[10px] truncate shrink-0 w-14" style={{ color: testoAttenuato }}>
          {settore}
        </span>
      )}

      <span className="font-bold uppercase text-xs tracking-wide truncate flex-1 min-w-0">
        {colorePrese}
      </span>

      <span className="flex items-center gap-1.5 shrink-0 max-w-[6.5rem]">
        <Avatar nome={tracciatoreNome} size="sm" />
        <span className="text-xs truncate" style={{ color: testo }}>
          {tracciatoreNome}
        </span>
      </span>

      <GradoStar coloreGrado={coloreGrado} size="md" />

      <span className="text-right shrink-0 w-14 leading-tight">
        <p className="text-xs font-medium">{formattaDataCompatta(dataUltimoCambio)}</p>
        <p className="text-[10px]" style={{ color: testoAttenuato }}>
          {giorniFaCompatto(dataUltimoCambio)}
        </p>
      </span>

      {mostraCestino && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onElimina()
          }}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 text-sm"
          style={{ color: testo }}
          aria-label="Rimuovi boulder"
          title="Rimuovi boulder"
        >
          🗑️
        </button>
      )}
    </div>
  )
}
