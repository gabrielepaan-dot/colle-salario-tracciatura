export function giorniFa(dataStr) {
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
  return `${giorni} giorni fa`
}

export function formattaData(dataStr) {
  if (!dataStr) return ''
  const data = new Date(dataStr)
  return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Variante compatta (senza anno) per la mini-tabella di Dettaglio settore,
// dove lo spazio orizzontale è limitato.
export function formattaDataCompatta(dataStr) {
  if (!dataStr) return ''
  const data = new Date(dataStr)
  return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

// Variante abbreviata di giorniFa ("3gg fa" invece di "3 giorni fa"), per la
// stessa mini-tabella densa.
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
