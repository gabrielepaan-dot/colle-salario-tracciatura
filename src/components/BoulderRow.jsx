import Avatar from './Avatar'
import GradoStar from './GradoStar'
import { COLORI_PRESE, sfondoColorePrese, testoPerColorePrese, nomeColorePrese } from '../lib/colori'
import { formattaDataCompatta, giorniFaCompatto } from '../lib/date'

// Solo per lo sfondo dell'intera riga: in COLORI_PRESE "bianco" è un grigio
// medio (serve a restare leggibile come testo/bordo su sfondo bianco nei
// chip del form e nel pallino della tabella di creazione), ma qui il colore
// riempie tutta la riga, quindi un grigio medio si confonde con "nessun
// colore" — un bianco panna distingue la riga dallo sfondo pagina restando
// riconoscibile come presa bianca.
const SFONDO_RIGA_OVERRIDE = {
  bianco: '#FFFBEB',
}

// Ogni cella è un bersaglio indipendente: toccarla apre il pannello di
// modifica di QUEL solo campo (vedi la prop `campo` di BoulderForm). Prima
// era l'intera riga ad essere un unico bottone che apriva il form completo,
// ed era facilissimo cambiare il colore prese volendo cambiare il grado.
// Lo spazio "morto" tra una cella e l'altra non fa più niente, di proposito.
function Cella({ cliccabile, onClick, etichetta, className, style, children }) {
  if (!cliccabile) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={etichetta}
      title={etichetta}
      className={`${className} rounded-md hover:bg-black/5 active:bg-black/10 transition-colors`}
      style={style}
    >
      {children}
    </button>
  )
}

// Riga densa "stile Excel" condivisa da Dettaglio settore e dalla vista
// Filtri: l'intero sfondo è il vero colore prese del boulder, con testo
// chiaro/scuro scelto per contrasto (non sempre "chiaro": alcuni gialli/
// arancioni leggono meglio con testo scuro pur essendo colori "di brand"
// pieni). mostraSettore aggiunge la colonna Settore, necessaria solo nella
// vista Filtri dove i boulder arrivano da pareti diverse.
export default function BoulderRow({ boulder, mostraSettore, cliccabile, onModifica, mostraCestino, onElimina, isAdmin }) {
  const { settore, colorePrese, coloreGrado, tracciatoreNome, dataUltimoCambio } = boulder

  const sfondoNormale = SFONDO_RIGA_OVERRIDE[colorePrese] || COLORI_PRESE[colorePrese] || '#374151'
  const sfondo = sfondoColorePrese(colorePrese, sfondoNormale)
  const testo = testoPerColorePrese(colorePrese, sfondoNormale)
  const testoAttenuato = testo === '#FFFFFF' ? 'rgba(255,255,255,0.75)' : 'rgba(17,17,17,0.65)'
  // "Giallo old" è già un colore a sé stante (il nome lo dice), ma condivide
  // la stessa resa desaturata degli altri colori marcati old:true.
  const desaturato = !!boulder.old || colorePrese === 'giallo_old'
  const modificabile = !!cliccabile && !!onModifica

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5"
      style={{
        background: sfondo,
        color: testo,
        filter: desaturato ? 'saturate(0.62) brightness(1.04)' : undefined,
        opacity: desaturato ? 0.88 : 1,
      }}
    >
      {mostraSettore && (
        <span className="text-[10px] truncate shrink-0 w-14" style={{ color: testoAttenuato }}>
          {settore}
        </span>
      )}

      <Cella
        cliccabile={modificabile}
        onClick={() => onModifica('colorePrese')}
        etichetta="Modifica colore prese"
        className="font-bold uppercase text-xs tracking-wide truncate text-left flex-1 min-w-14 px-1 -mx-1 py-1 -my-1"
      >
        {nomeColorePrese(colorePrese)}
        {boulder.old && <span className="font-normal normal-case"> · old</span>}
        {boulder.permanente && <span className="font-normal normal-case"> · fissa</span>}
      </Cella>

      <Cella
        cliccabile={modificabile}
        onClick={() => onModifica('tracciatore')}
        etichetta="Modifica tracciatore"
        className="flex items-center gap-1.5 shrink min-w-12 w-[6.5rem] px-1 -mx-1 py-1 -my-1"
      >
        <Avatar nome={tracciatoreNome} size="sm" />
        <span className="text-xs truncate min-w-0" style={{ color: testo }}>
          {tracciatoreNome}
        </span>
      </Cella>

      <Cella
        cliccabile={modificabile}
        onClick={() => onModifica('coloreGrado')}
        etichetta="Modifica grado"
        className="shrink-0 flex items-center px-1.5 -mx-1 py-1.5 -my-1"
      >
        <GradoStar coloreGrado={coloreGrado} size="md" />
      </Cella>

      <Cella
        cliccabile={modificabile}
        onClick={() => onModifica('data')}
        etichetta="Modifica data"
        className="text-right shrink-0 w-14 leading-tight px-1 -mx-1 py-1 -my-1"
      >
        <span className="block text-xs font-medium">{formattaDataCompatta(dataUltimoCambio)}</span>
        <span className="block text-[10px]" style={{ color: testoAttenuato }}>
          {giorniFaCompatto(dataUltimoCambio)}
        </span>
      </Cella>

      {mostraCestino && (!boulder.permanente || isAdmin) && (
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
