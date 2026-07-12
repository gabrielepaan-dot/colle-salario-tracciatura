import { COLORI_GRADO } from '../lib/colori'

const DIMENSIONI = {
  sm: { box: 'w-4 h-4', star: 'text-[9px]' },
  md: { box: 'w-6 h-6', star: 'text-sm' },
}

// Componente unico per il grado: stellina colorata sulla scala a 8 colori
// bianco→nero, con un cerchietto chiaro semi-trasparente dietro per restare
// leggibile sia sullo sfondo tinto delle righe-tabella sia sullo sfondo
// bianco/navy dei chip nel form. Usato in entrambi i posti per non avere
// due implementazioni parallele dello stesso indicatore.
export default function GradoStar({ coloreGrado, size = 'md' }) {
  const colore = COLORI_GRADO[coloreGrado] || '#374151'
  const { box, star } = DIMENSIONI[size] || DIMENSIONI.md

  return (
    <span
      className={`relative inline-flex items-center justify-center ${box} shrink-0`}
      title={`Grado: ${coloreGrado}`}
    >
      <span className="absolute inset-0 rounded-full bg-white/70" />
      <span className={`relative ${star} leading-none`} style={{ color: colore }}>
        ★
      </span>
    </span>
  )
}
