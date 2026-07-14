// Migrazione one-off: imposta tipo: 'boulder' su tutti i documenti delle
// collection `boulder` e `storico` che ne sono privi (dati creati prima
// dell'introduzione della sezione Corda). Va eseguito manualmente da
// terminale, non è una Cloud Function.
//
// Uso:
//   node scripts/migrate-tipo.mjs            → dry-run, stampa solo i conteggi
//   node scripts/migrate-tipo.mjs --write     → scrive davvero (dopo aver
//                                                controllato l'esito del dry-run)
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore'

process.loadEnvFile('.env')

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

const scrivi = process.argv.includes('--write')

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const BATCH_MAX = 500

async function docsSenzaTipo(nomeCollezione) {
  const snap = await getDocs(collection(db, nomeCollezione))
  return snap.docs.filter((d) => d.data().tipo === undefined)
}

async function scriviTipoBoulder(nomeCollezione, docsSenzaTipo) {
  for (let i = 0; i < docsSenzaTipo.length; i += BATCH_MAX) {
    const gruppo = docsSenzaTipo.slice(i, i + BATCH_MAX)
    const batch = writeBatch(db)
    gruppo.forEach((d) => batch.update(doc(db, nomeCollezione, d.id), { tipo: 'boulder' }))
    await batch.commit()
    console.log(`  scritto batch di ${gruppo.length} documenti in "${nomeCollezione}"`)
  }
}

async function main() {
  console.log(scrivi ? 'Modalità: SCRITTURA (--write)' : 'Modalità: DRY-RUN (nessuna scrittura)')
  console.log(`Progetto Firestore: ${firebaseConfig.projectId}`)
  console.log('')

  const boulderDaAggiornare = await docsSenzaTipo('boulder')
  const storicoDaAggiornare = await docsSenzaTipo('storico')

  console.log(`boulder: ${boulderDaAggiornare.length} documenti privi di "tipo"`)
  console.log(`storico: ${storicoDaAggiornare.length} documenti privi di "tipo"`)
  console.log('')

  if (!scrivi) {
    console.log('Dry-run completato. Rilancia con --write per applicare la scrittura.')
    return
  }

  if (boulderDaAggiornare.length === 0 && storicoDaAggiornare.length === 0) {
    console.log('Niente da scrivere, tutti i documenti hanno già il campo "tipo".')
    return
  }

  await signInAnonymously(auth)
  console.log('Autenticato in modo anonimo, avvio scrittura...')

  await scriviTipoBoulder('boulder', boulderDaAggiornare)
  await scriviTipoBoulder('storico', storicoDaAggiornare)

  console.log('')
  console.log('Migrazione completata.')
}

main()
  .catch((e) => {
    console.error('Errore durante la migrazione:', e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
