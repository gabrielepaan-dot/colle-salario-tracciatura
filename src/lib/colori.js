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
  'Strapiombo giallo', 'Diamond', 'Tetto',
  'Torre Alta', 'Torre bassa',
]

export const LISTA_SETTORI_CORDA = Array.from({ length: 10 }, (_, i) => `Corda ${i + 1}`)

// Deriva il tipo ('boulder' | 'corda') dal nome del settore, così le
// schermate che conoscono solo il settore (es. Dettaglio settore, Cestino)
// non devono farsi passare esplicitamente il tipo da chi le apre.
export function tipoDiSettore(settore) {
  return LISTA_SETTORI_CORDA.includes(settore) ? 'corda' : 'boulder'
}

export const LISTA_COLORI_PRESE = Object.keys(COLORI_PRESE)
export const LISTA_COLORI_GRADO = Object.keys(COLORI_GRADO)

// Colori "prese" speciali: set chiuso di 5 valori (3 bicolore + 2 pieni),
// separati dai 12 base perché usati più raramente. I bicolore sono resi come
// swatch/sfondo con split diagonale hard-stop (due metà, nessuna sfumatura);
// "giallo old" è un colore a sé stante (non un flag "old" su "giallo fluo"),
// reso con lo stesso stile desaturato usato per gli altri colori marcati old.
export const COLORI_SPECIALI = {
  giallorosso: { nome: 'Giallorosso', tipo: 'bicolore', hex1: '#CBD90A', hex2: '#DC2626' },
  biancoceleste: { nome: 'Biancoceleste', tipo: 'bicolore', hex1: '#9CA3AF', hex2: '#0EA5E9' },
  verdenero: { nome: 'Verdenero', tipo: 'bicolore', hex1: '#14532D', hex2: '#111111' },
  giallo_old: { nome: 'Giallo old', tipo: 'pieno', hex: '#CBD90A', desaturato: true },
  mattone: { nome: 'Mattone', tipo: 'pieno', hex: '#A0522D' },
}

export const LISTA_COLORI_SPECIALI = Object.keys(COLORI_SPECIALI)

// Giallo fluo e giallo oro non hanno una variante "old" via toggle: esiste
// solo "Giallo old" come colore speciale indipendente (vedi COLORI_SPECIALI).
export const COLORI_SENZA_OLD = ['giallo fluo', 'giallo oro']

export function isColoreSpeciale(colorePrese) {
  return Object.prototype.hasOwnProperty.call(COLORI_SPECIALI, colorePrese)
}

// Il toggle "OLD" è applicabile solo a un colore base normale (10 dei 12):
// non ai due gialli chiari (che non hanno variante old) né a uno speciale
// (che ha già una resa/nome propri, "old" non si applica).
export function supportaOld(colorePrese) {
  return LISTA_COLORI_PRESE.includes(colorePrese) && !COLORI_SENZA_OLD.includes(colorePrese)
}

// Nome leggibile da mostrare in UI: gli speciali hanno un nome proprio
// (es. "giallo_old" -> "Giallo old"), i colori normali restano invariati
// (già gestiti altrove con la classe CSS "capitalize").
export function nomeColorePrese(colorePrese) {
  return COLORI_SPECIALI[colorePrese]?.nome || colorePrese
}

// Hex singolo rappresentativo di un colorePrese (anche speciale), usato dove
// serve per forza un unico colore solido — es. una tinta `${hex}22` di sfondo
// riga — e non un gradiente (i bicolore restituiscono la prima metà).
export function hexRappresentativo(colorePrese) {
  const speciale = COLORI_SPECIALI[colorePrese]
  if (speciale?.tipo === 'bicolore') return speciale.hex1
  if (speciale?.tipo === 'pieno') return speciale.hex
  return COLORI_PRESE[colorePrese]
}

// Valore CSS "background" per uno swatch o per lo sfondo di un'intera riga:
// hex pieno per colori normali/pieni, gradiente diagonale hard-stop (nessuna
// sfumatura) per i bicolore. Va assegnato alla proprietà "background", non
// "backgroundColor" (che non supporta i gradienti).
export function sfondoColorePrese(colorePrese, sfondoNormale) {
  const speciale = COLORI_SPECIALI[colorePrese]
  if (speciale?.tipo === 'bicolore') {
    return `linear-gradient(135deg, ${speciale.hex1} 50%, ${speciale.hex2} 50%)`
  }
  if (speciale?.tipo === 'pieno') return speciale.hex
  return sfondoNormale
}

// Colore testo leggibile per un dato colorePrese: per i bicolore media i due
// hex prima di applicare testoLeggibileSu, per evitare un contrasto scorretto
// calcolato su una sola delle due metà del gradiente.
export function testoPerColorePrese(colorePrese, sfondoNormale) {
  const speciale = COLORI_SPECIALI[colorePrese]
  if (speciale?.tipo === 'bicolore') {
    const media = mediaHex(speciale.hex1, speciale.hex2)
    return testoLeggibileSu(media)
  }
  return testoLeggibileSu(speciale?.hex || sfondoNormale)
}

function mediaHex(hexA, hexB) {
  const canale = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const media = (i) => Math.round((canale(hexA, i) + canale(hexB, i)) / 2)
    .toString(16)
    .padStart(2, '0')
  return `#${media(0)}${media(1)}${media(2)}`
}

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
