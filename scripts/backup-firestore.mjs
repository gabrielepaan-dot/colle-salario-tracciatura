// Backup giornaliero di boulder, storico e tracciatori in un unico JSON.
// Usa il client SDK in sola lettura (nessun Admin SDK, nessuna scrittura):
// le tre collezioni hanno già `allow read: if true` in firestore.rules
// (vedi generate-public-snapshot.mjs, stesso pattern), quindi bastano le
// env var VITE_FIREBASE_* già pubbliche per design.
//
// A differenza dello snapshot pubblico, qui l'export è COMPLETO: tutti i
// documenti (non solo stato: 'attiva') e tutti i campi, incluso l'id, per
// poter davvero ripristinare i dati in caso di necessità.
//
// Uso:
//   node scripts/backup-firestore.mjs [percorso-output.json]
//   (default: ./backup.json)
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { writeFileSync, existsSync } from 'node:fs'

if (existsSync('.env')) process.loadEnvFile('.env')

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Config Firebase mancante: manca il file .env con le chiavi VITE_FIREBASE_*.')
  process.exit(1)
}

const percorsoOutput = process.argv[2] || './backup.json'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function esportaCollezione(nome) {
  const snap = await getDocs(collection(db, nome))
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

main().catch((e) => {
  console.error('Errore durante il backup:', e)
  process.exit(1)
})
