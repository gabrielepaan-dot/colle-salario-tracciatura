// Genera lo snapshot JSON pubblico letto dalla Vista pubblica (#/pubblico),
// servito staticamente dal branch orfano "public-data" (mai da "main").
// Usa il client SDK (non firebase-admin): boulder/tracciatori hanno già
// `allow read: if true` in firestore.rules, quindi non serve alcuna
// credenziale privilegiata, solo le stesse env var VITE_FIREBASE_* già
// pubbliche per design (vedi src/lib/firebase.js).
//
// Uso:
//   node scripts/generate-public-snapshot.mjs [percorso-output.json]
//   (default: ./public-snapshot.json)
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import { writeFileSync, existsSync } from 'node:fs'

// In locale le VITE_FIREBASE_* vengono dal file .env; in CI (workflow
// public-snapshot.yml) sono già nell'ambiente via GitHub Secrets e il file
// .env non esiste (è in .gitignore) — caricarlo incondizionatamente farebbe
// crashare lo script lì con ENOENT.
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

const percorsoOutput = process.argv[2] || './public-snapshot.json'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Solo i campi utili al pubblico: esclusi id documento, tracciatoreId, note,
// stato, creatoIl, rimossoDa/rimossoIl (nessun campo gestionale/interno).
function campiPubblici(doc) {
  return {
    settore: doc.settore,
    tipo: doc.tipo,
    colorePrese: doc.colorePrese,
    coloreGrado: doc.coloreGrado || '',
    old: !!doc.old,
    tracciatoreNome: doc.tracciatoreNome || '',
    dataUltimoCambio: doc.dataUltimoCambio,
  }
}

async function main() {
  const q = query(collection(db, 'boulder'), where('stato', '==', 'attiva'))
  const snap = await getDocs(q)
  const boulder = snap.docs.map((d) => campiPubblici(d.data()))

  const output = {
    generatoIl: new Date().toISOString(),
    boulder,
  }

  writeFileSync(percorsoOutput, JSON.stringify(output))
  console.log(`Scritto ${percorsoOutput}: ${boulder.length} boulder/vie attivi.`)
}

main().catch((e) => {
  console.error('Errore durante la generazione dello snapshot pubblico:', e)
  process.exit(1)
})
