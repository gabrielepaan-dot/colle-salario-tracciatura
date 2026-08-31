// One-off: riallinea l'evento di CREAZIONE in `storico` ai campi correnti del
// documento `boulder` corrispondente.
//
// Perché serve: fino al commit "Allinea lo storico alle modifiche dei
// blocchi" la modalità update di BoulderForm toccava solo il documento
// `boulder`. Un grado aggiunto dopo la creazione, un tracciatore riassegnato
// o un settore corretto restavano quindi invisibili alle statistiche lette
// da `storico` (classifica per grado, grado medio, settore preferito).
// Questo script sistema i blocchi già "sbagliati" prima del fix.
//
// Campi allineati sull'evento di creazione: settore, colorePrese,
// coloreGrado, note, tracciatoreId, tracciatoreNome.
// NON tocca: dataEvento (il blocco resta nell'andamento nel periodo in cui è
// stato tracciato), creatoIl, tipo, stato, eseguitoDaUid/eseguitoDaNome
// (l'identità reale di chi inserì il dato la prima volta resta tracciata).
//
// Usa l'Admin SDK (bypassa le Rules e App Check), stesso pattern di
// backup-firestore.mjs. Richiede GOOGLE_APPLICATION_CREDENTIALS.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//     node scripts/allinea-storico.mjs            → dry-run, stampa le differenze
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//     node scripts/allinea-storico.mjs --write     → applica le correzioni
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credentialPath) {
  console.error(
    'Manca GOOGLE_APPLICATION_CREDENTIALS: imposta il percorso del file service account key (vedi commento in testa a questo script).'
  )
  process.exit(1)
}

const scrivi = process.argv.includes('--write')

const app = initializeApp({ credential: applicationDefault() })
const db = getFirestore(app)

// Campi da confrontare/allineare (chiave = nome campo su entrambi i doc).
const CAMPI = ['settore', 'colorePrese', 'coloreGrado', 'note', 'tracciatoreId', 'tracciatoreNome']

// Normalizza per un confronto stabile: null/undefined/'' equivalenti.
function norm(v) {
  return v === undefined || v === null || v === '' ? '' : v
}

function millis(ts) {
  if (!ts) return 0
  if (typeof ts.toMillis === 'function') return ts.toMillis()
  if (ts._seconds !== undefined) return ts._seconds * 1000
  const t = new Date(ts).getTime()
  return Number.isNaN(t) ? 0 : t
}

async function main() {
  console.log(scrivi ? 'Modalità: SCRITTURA (--write)' : 'Modalità: DRY-RUN (nessuna scrittura)')
  console.log('')

  const [boulderSnap, storicoSnap] = await Promise.all([
    db.collection('boulder').get(),
    db.collection('storico').get(),
  ])

  // storico raggruppato per boulderId
  const perBoulder = new Map()
  storicoSnap.docs.forEach((d) => {
    const bid = d.data().boulderId
    if (!bid) return
    if (!perBoulder.has(bid)) perBoulder.set(bid, [])
    perBoulder.get(bid).push(d)
  })

  let daCorreggere = 0
  let senzaStorico = 0
  let piuEventi = 0
  const aggiornamenti = []

  for (const bDoc of boulderSnap.docs) {
    const b = bDoc.data()
    const eventi = perBoulder.get(bDoc.id)
    if (!eventi || eventi.length === 0) {
      senzaStorico++
      console.log(`[senza storico] boulder ${bDoc.id} — ${b.settore} / ${b.colorePrese} / ${b.tracciatoreNome || '—'}`)
      continue
    }
    // evento di creazione = il più vecchio per creatoIl
    const creazione = eventi.slice().sort((x, y) => millis(x.data().creatoIl) - millis(y.data().creatoIl))[0]
    if (eventi.length > 1) piuEventi++

    const e = creazione.data()
    const diff = {}
    for (const campo of CAMPI) {
      if (norm(b[campo]) !== norm(e[campo])) {
        diff[campo] = { da: e[campo] ?? null, a: b[campo] ?? null }
      }
    }
    if (Object.keys(diff).length === 0) continue

    daCorreggere++
    console.log(`\nboulder ${bDoc.id}  (storico ${creazione.id})`)
    for (const [campo, { da, a }] of Object.entries(diff)) {
      console.log(`  ${campo}: ${JSON.stringify(da)}  ->  ${JSON.stringify(a)}`)
    }

    // payload: solo i campi che cambiano, normalizzando '' -> null per note e
    // tracciatoreId (coerente con come li salva l'app).
    const payload = {}
    for (const campo of Object.keys(diff)) {
      let val = b[campo]
      if (campo === 'note' || campo === 'tracciatoreId') val = val === undefined || val === '' ? null : val
      if (campo === 'coloreGrado') val = val || ''
      if (campo === 'settore' || campo === 'colorePrese' || campo === 'tracciatoreNome') val = val || ''
      payload[campo] = val
    }
    aggiornamenti.push({ ref: creazione.ref, payload })
  }

  console.log('\n———')
  console.log(`boulder totali:            ${boulderSnap.size}`)
  console.log(`eventi storico totali:     ${storicoSnap.size}`)
  console.log(`boulder senza storico:     ${senzaStorico}`)
  console.log(`boulder con >1 evento:     ${piuEventi} (corretto solo l'evento di creazione)`)
  console.log(`eventi da riallineare:     ${daCorreggere}`)

  if (!scrivi) {
    console.log('\nDry-run completato. Rilancia con --write per applicare.')
    return
  }
  if (aggiornamenti.length === 0) {
    console.log('\nNiente da scrivere.')
    return
  }

  const BATCH_MAX = 400
  for (let i = 0; i < aggiornamenti.length; i += BATCH_MAX) {
    const gruppo = aggiornamenti.slice(i, i + BATCH_MAX)
    const batch = db.batch()
    gruppo.forEach(({ ref, payload }) => batch.update(ref, payload))
    await batch.commit()
    console.log(`scritto batch di ${gruppo.length} eventi`)
  }
  console.log('\nAllineamento completato.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Errore:', e)
    process.exit(1)
  })
