// Colori "prese" — usati come testo colorato nelle card e (in Dettaglio
// settore) come sfondo dell'intera riga.
// Alcuni colori chiari (bianco, giallo fluo, verde fluo) sono leggermente
// scuriti rispetto all'originale per restare leggibili su sfondo bianco,
// pur restando riconoscibili come quella famiglia di colore.
// "giallo oro" è stato scurito verso un senape per restare ben distinto
// sia da "giallo fluo" (giallo-verde acceso) sia da "arancione".
export const COLORI_PRESE = {
  arancione: '#F97316',
  bianco: '#9CA3AF',
  blu: '#1D4ED8',
  celeste: '#0EA5E9',
  'giallo fluo': '#CBD90A',
  'giallo oro': '#B8960B',
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

// Sceglie tra bianco e nero il colore di testo con più contrasto su un dato
// sfondo (formula di luminanza relativa WCAG). Usato in Dettaglio settore,
// dove lo sfondo dell'intera riga è il vero colore prese: alcuni colori
// chiari della famiglia giallo/arancio leggono meglio con testo scuro anche
// se "sembrano" colori scuri di brand.
export function testoLeggibileSu(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const luminanza = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const contrastoBianco = 1.05 / (luminanza + 0.05)
  const contrastoNero = (luminanza + 0.05) / 0.05
  return contrastoBianco >= contrastoNero ? '#FFFFFF' : '#111111'
}
