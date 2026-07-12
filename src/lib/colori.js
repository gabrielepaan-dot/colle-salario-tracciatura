// Colori "prese" — usati come testo colorato nelle card.
// Alcuni colori chiari (bianco, giallo fluo, verde fluo) sono leggermente
// scuriti rispetto all'originale per restare leggibili su sfondo bianco,
// pur restando riconoscibili come quella famiglia di colore.
export const COLORI_PRESE = {
  bianco: '#9CA3AF',
  blu: '#1D4ED8',
  celeste: '#0EA5E9',
  'giallo fluo': '#CBD90A',
  'giallo oro': '#D4A017',
  nero: '#111111',
  rosa: '#EC4899',
  rosso: '#DC2626',
  'verde scuro': '#14532D',
  'verde fluo': '#22C55E',
  viola: '#7C3AED',
}

// Colori "grado difficoltà" — usati come pallino pieno accanto al boulder.
// Ordine facile → difficile (coerente con la tabella gradi_ordine in SQL).
export const COLORI_GRADO = {
  bianco: '#E5E7EB',
  blu: '#2563EB',
  verde: '#16A34A',
  giallo: '#FACC15',
  arancione: '#F97316',
  rosso: '#DC2626',
  viola: '#7C3AED',
  nero: '#111111',
}

export const ORDINE_GRADI = Object.keys(COLORI_GRADO)

export const LISTA_SETTORI = [
  'Parete 1', 'Parete 2', 'Parete 3',
  'Sala boulder dx', 'Sala boulder sx',
  'Tetto dx (giallo)', 'Diamond', 'Tetto',
  'Torre Alta', 'Torre bassa arancio',
]

export const LISTA_COLORI_PRESE = Object.keys(COLORI_PRESE)
export const LISTA_COLORI_GRADO = Object.keys(COLORI_GRADO)
