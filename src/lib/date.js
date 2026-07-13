// Variante compatta (senza anno), usata nelle mini-tabelle stile Excel di
// Dettaglio settore e della vista Filtri, dove lo spazio orizzontale è
// limitato.
export function formattaDataCompatta(dataStr) {
  if (!dataStr) return ''
  const data = new Date(dataStr)
  return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

// Variante estesa ("3 giorni fa") per pagine dove lo spazio non è stretto
// come nelle mini-tabelle (es. Cestino). Accetta sia un Timestamp Firestore
// (con .toDate) sia una stringa data semplice.
export function formattaTempoFa(valore) {
  if (!valore) return 'data sconosciuta'
  const data = valore?.toDate ? valore.toDate() : new Date(valore)
  const oggi = new Date()
  const inizioOggi = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
  const inizioData = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  const giorni = Math.round((inizioOggi - inizioData) / (1000 * 60 * 60 * 24))

  if (giorni === 0) return 'oggi'
  if (giorni === 1) return 'ieri'
  if (giorni > 1) return `${giorni} giorni fa`
  return data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
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
