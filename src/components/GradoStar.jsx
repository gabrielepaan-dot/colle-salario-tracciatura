import { COLORI_GRADO } from '../lib/colori'

const DIMENSIONI = {
  sm: 16,
  md: 24,
}

// Stella a 5 punte disegnata a mano su viewBox 24x24 (centro 12,12).
const STELLA_PATH =
  'M12,3 L14.12,9.09 L20.56,9.22 L15.42,13.11 L17.29,19.28 L12,15.6 L6.71,19.28 L8.58,13.11 L3.44,9.22 L9.88,9.09 Z'

// Componente unico per il grado: stellina colorata sulla scala a 8 colori
// bianco→nero, con un cerchietto chiaro semi-trasparente dietro per restare
// leggibile sia sullo sfondo tinto delle righe-tabella sia sullo sfondo
// bianco/navy dei chip nel form. Usato in entrambi i posti per non avere
// due implementazioni parallele dello stesso indicatore.
export default function GradoStar({ coloreGrado, size = 'md' }) {
  const impostato = !!coloreGrado && COLORI_GRADO[coloreGrado] !== undefined
  const colore = impostato ? COLORI_GRADO[coloreGrado] : '#111111'
  const px = DIMENSIONI[size] || DIMENSIONI.md

  return (
    <svg viewBox="0 0 24 24" width={px} height={px} className="shrink-0">
      <title>{impostato ? `Grado: ${coloreGrado}` : 'Nessun grado'}</title>
      <circle cx="12" cy="12" r="11" fill="white" fillOpacity="0.7" stroke="black" strokeWidth="1" />
      {impostato ? (
        <path d={STELLA_PATH} fill={colore} stroke="black" strokeWidth="1" strokeLinejoin="round" />
      ) : (
        <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#111111">
          ?
        </text>
      )}
    </svg>
  )
}
