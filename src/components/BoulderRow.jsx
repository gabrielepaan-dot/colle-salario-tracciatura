import Avatar from './Avatar'
import { COLORI_PRESE, COLORI_GRADO, testoLeggibileSu } from '../lib/colori'
import { formattaDataCompatta, giorniFaCompatto } from '../lib/date'

// Riga densa "stile Excel" per la mini-tabella di Dettaglio settore: l'intero
// sfondo è il vero colore prese del boulder, con testo chiaro/scuro scelto
// per contrasto (non sempre "chiaro": alcuni gialli/arancioni leggono
// meglio con testo scuro pur essendo colori "di brand" pieni).
export default function BoulderRow({ boulder, cliccabile, onClick }) {
  const { colorePrese, coloreGrado, stato, tracciatoreNome, dataUltimoCambio } = boulder

  const sfondo = COLORI_PRESE[colorePrese] || '#374151'
  const testo = testoLeggibileSu(sfondo)
  const coloreGradoDot = COLORI_GRADO[coloreGrado] || '#374151'
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
      className={`flex items-center gap-2 px-3 py-2.5 ${
        cliccabile ? 'cursor-pointer active:opacity-80' : ''
      } ${stato === 'vuota' ? 'opacity-50' : ''}`}
      style={{ backgroundColor: sfondo, color: testo }}
    >
      <span className="font-bold uppercase text-xs tracking-wide truncate flex-1 min-w-0">
        {colorePrese}
      </span>

      <span className="flex items-center gap-1.5 shrink-0 max-w-[6.5rem]">
        <Avatar nome={tracciatoreNome} size="sm" />
        <span className="text-xs truncate" style={{ color: testo }}>
          {tracciatoreNome}
        </span>
      </span>

      <span className="relative inline-flex items-center justify-center w-5 h-5 shrink-0" title={`Grado: ${coloreGrado}`}>
        <span className="absolute inset-0 rounded-full bg-white/70" />
        <span className="relative text-[11px] leading-none" style={{ color: coloreGradoDot }}>
          ★
        </span>
      </span>

      <span className="text-right shrink-0 w-14 leading-tight">
        <p className="text-xs font-medium">{formattaDataCompatta(dataUltimoCambio)}</p>
        <p className="text-[10px]" style={{ color: testoAttenuato }}>
          {giorniFaCompatto(dataUltimoCambio)}
        </p>
      </span>
    </div>
  )
}
