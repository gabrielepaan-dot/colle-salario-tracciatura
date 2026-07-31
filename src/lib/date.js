import { Timestamp, serverTimestamp } from 'firebase/firestore'

// Apertura ufficiale al pubblico: prima di questa data i blocchi tracciati
// (durante il pre-stagione di agosto 2026) non devono invecchiare dalla loro
// data reale — vedi dataEffettiva() sotto.
const DATA_APERTURA_STAGIONE = '2026-09-01'

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

// Giorni interi tra due Timestamp Firestore (o date), usato in Cestino per
// calcolare quanto un blocco è stato in parete (rimossoIl - creatoIl) prima
// dell'eliminazione definitiva. Se manca uno dei due timestamp (blocco
// storico senza creatoIl affidabile), ritorna null: il chiamante tratta
// "sconosciuto" come "meglio avvisare" (>= 7 giorni).
export function giorniTra(inizio, fine) {
  const inizioDate = inizio?.toDate ? inizio.toDate() : inizio ? new Date(inizio) : null
  const fineDate = fine?.toDate ? fine.toDate() : fine ? new Date(fine) : null
  if (!inizioDate || !fineDate) return null
  return Math.round((fineDate.getTime() - inizioDate.getTime()) / (1000 * 60 * 60 * 24))
}

// Calcola la "data effettiva" da usare per creatoIl/dataUltimoCambio
// (boulder) e creatoIl/dataEvento (storico) al momento del salvataggio.
// Finché la data odierna (fuso Europe/Rome, DST-aware) precede l'apertura
// ufficiale, un blocco tracciato oggi deve comunque risultare "nato" il 1
// settembre 2026 — qualunque data l'utente abbia scelto nel selettore del
// form — così non inizia ad invecchiare (Cestino, durata media, andamento
// in Statistiche) prima dell'apertura vera. Dopo l'apertura il meccanismo si
// autodisattiva: preApertura torna false e il chiamante torna a usare la
// data scelta dall'utente come sempre. Timestamp e dataISO sono calcolati
// insieme per non avere due sorgenti di verità sulla stessa decisione.
// Il parametro opzionale "ora" permette di testare la funzione passando
// date finte, senza dipendere dall'orologio reale del sistema.
export function dataEffettiva(ora = new Date()) {
  const oggi = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(ora)
  const preApertura = oggi < DATA_APERTURA_STAGIONE
  return {
    preApertura,
    timestamp: preApertura
      ? Timestamp.fromDate(new Date(`${DATA_APERTURA_STAGIONE}T00:00:00Z`))
      : serverTimestamp(),
    dataISO: preApertura ? DATA_APERTURA_STAGIONE : oggi,
  }
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
