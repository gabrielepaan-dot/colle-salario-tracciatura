// Variante compatta (senza anno), usata nelle mini-tabelle stile Excel di
// Dettaglio settore e della vista Filtri, dove lo spazio orizzontale è
// limitato.
export function formattaDataCompatta(dataStr) {
  if (!dataStr) return ''
  const data = new Date(dataStr)
  return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

// "3gg fa" invece di "3 giorni fa", per la stessa mini-tabella densa.
export function giorniFaCompatto(dataStr) {
  if (!dataStr) return null
  const oggi = new Date()
  const data = new Date(dataStr)
  oggi.setHours(0, 0, 0, 0)
  data.setHours(0, 0, 0, 0)
  const diffMs = oggi - data
  const giorni = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (giorni === 0) return 'oggi'
  if (giorni === 1) return 'ieri'
  if (giorni < 0) return 'nel futuro'
  return `${giorni}gg fa`
}
