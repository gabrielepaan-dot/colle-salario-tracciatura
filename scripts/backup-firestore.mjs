// Backup giornaliero di boulder, storico e tracciatori in un unico JSON.
//
// Usa l'Admin SDK (firebase-admin), non il client SDK: con Firebase App
// Check in modalità enforcement, le letture del client SDK richiedono un
// token App Check valido, che questo script (eseguito headless in CI, senza
// browser/reCAPTCHA) non può fornire — verrebbero bloccate. Stesso motivo e
// stesso pattern già applicati a generate-public-snapshot.mjs.
//
// A differenza dello snapshot pubblico, qui l'export è COMPLETO: tutti i
// documenti (non solo stato: 'attiva') e tutti i campi, incluso l'id, per
// poter davvero ripristinare i dati in caso di necessità.
//
// Richiede GOOGLE_APPLICATION_CREDENTIALS (percorso a un file service
// account key), stesso meccanismo di set-shared-password.mjs /
// generate-public-snapshot.mjs.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//     node scripts/backup-firestore.mjs [percorso-output.json]
//   (default: ./backup.json)
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFileSync } from 'node:fs'

const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credentialPath) {
  console.error(
    'Manca GOOGLE_APPLICATION_CREDENTIALS: imposta il percorso del file service account key (vedi commento in testa a questo script).'
  )
  process.exit(1)
}

const percorsoOutput = process.argv[2] || './backup.json'

const app = initializeApp({ credential: applicationDefault() })
const db = getFirestore(app)

async function esportaCollezione(nome) {
  const snap = await db.collection(nome).get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function main() {
  const [boulder, storico, tracciatori] = await Promise.all([
    esportaCollezione('boulder'),
    esportaCollezione('storico'),
    esportaCollezione('tracciatori'),
  ])

  const output = {
    generatoIl: new Date().toISOString(),
    boulder,
    storico,
    tracciatori,
  }

  writeFileSync(percorsoOutput, JSON.stringify(output))
  console.log(
    `Scritto ${percorsoOutput}: ${boulder.length} boulder, ${storico.length} storico, ${tracciatori.length} tracciatori.`
  )
}

main()
  .catch((e) => {
    console.error('Errore durante il backup:', e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
