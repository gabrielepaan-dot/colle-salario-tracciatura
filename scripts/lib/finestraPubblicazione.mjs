// Decide se l'invocazione corrente del cron deve generare/pubblicare un
// nuovo snapshot pubblico, in base alla fascia oraria locale di Roma.
// Isolato in un modulo a parte (invece che inline in
// generate-public-snapshot.mjs) per poterlo leggere/testare da solo.
//
// Fasce (ora locale Roma, gestita con Intl.DateTimeFormat: CET/CEST
// automatici, nessuna manutenzione manuale ai cambi ora legale/solare):
//   23:00–11:00  → mai
//   11:00–17:00  → al più un aggiornamento ogni ora
//   17:00–22:30  → al più un aggiornamento ogni 30 minuti
//
// Il workflow (public-snapshot.yml) triggera più spesso del necessario
// (ogni 30 min, in una finestra UTC larga per coprire 11:00–22:30 di Roma
// sia in CET sia in CEST con margine); questo modulo decide, ad ogni run,
// se è davvero il momento di pubblicare — leggendo `generatoIl` dell'ultimo
// snapshot già pubblicato sul branch public-data (nessun nuovo stato da
// introdurre: il campo esiste già nell'output).
const SNAPSHOT_URL =
  'https://raw.githubusercontent.com/gabrielepaan-dot/colle-salario-tracciatura/public-data/public-snapshot.json'

function minutiDalMezzanotteRoma(data) {
  const parti = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(data)
  const ore = Number(parti.find((p) => p.type === 'hour').value)
  const minuti = Number(parti.find((p) => p.type === 'minute').value)
  return ore * 60 + minuti
}

// Intervallo minimo (in minuti) richiesto tra due pubblicazioni per la
// fascia corrente, o null se la fascia è "nessun aggiornamento". La mezz'ora
// 22:30–23:00 non è coperta esplicitamente dalla spec (le fasce indicate si
// fermano a 22:30): trattata come "mai", stessa scelta prudente della notte,
// invece di introdurre una quarta fascia non richiesta.
function intervalloMinimoMinuti(minutiLocali) {
  const m = minutiLocali
  if (m >= 23 * 60 || m < 11 * 60) return null
  if (m < 17 * 60) return 60
  if (m < 22 * 60 + 30) return 30
  return null
}

async function ultimaPubblicazioneIso() {
  try {
    const res = await fetch(SNAPSHOT_URL)
    if (!res.ok) return null
    const json = await res.json()
    return json.generatoIl || null
  } catch {
    return null
  }
}

// `adesso` iniettabile (default `new Date()`), utile per verifiche manuali
// su fasce specifiche senza aspettare l'orario reale.
export async function devePubblicare(adesso = new Date()) {
  const minutiLocali = minutiDalMezzanotteRoma(adesso)
  const intervalloMinimo = intervalloMinimoMinuti(minutiLocali)

  if (intervalloMinimo === null) {
    return { pubblica: false, motivo: 'fuori fascia di pubblicazione (23:00–11:00 ora di Roma)' }
  }

  const ultimaIso = await ultimaPubblicazioneIso()
  if (!ultimaIso) {
    return { pubblica: true, motivo: 'nessuno snapshot precedente trovato su public-data' }
  }

  const minutiTrascorsi = Math.floor((adesso.getTime() - new Date(ultimaIso).getTime()) / 60000)
  if (minutiTrascorsi >= intervalloMinimo) {
    return {
      pubblica: true,
      motivo: `ultimo snapshot ${minutiTrascorsi} min fa (minimo richiesto in questa fascia: ${intervalloMinimo} min)`,
    }
  }
  return {
    pubblica: false,
    motivo: `ultimo snapshot solo ${minutiTrascorsi} min fa (minimo richiesto in questa fascia: ${intervalloMinimo} min)`,
  }
}
