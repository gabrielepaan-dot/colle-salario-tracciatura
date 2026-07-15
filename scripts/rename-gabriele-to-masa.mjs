// Migrazione one-off: rinomina il tracciatore "Gabriele" -> "Masa".
// Aggiorna il documento anagrafico in `tracciatori` e propaga il nuovo nome
// ai dati denormalizzati (`tracciatoreNome` in boulder/storico,
// `eseguitoDaNome` in storico). uid, id documento e isAdmin non cambiano.
//
// Uso:
//   node scripts/rename-gabriele-to-masa.mjs            → dry-run, stampa solo i conteggi
//   node scripts/rename-gabriele-to-masa.mjs --write     → scrive davvero (dopo aver
//                                                           controllato l'esito del dry-run)
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, collection, getDocs, query, where, doc, writeBatch, setDoc, deleteDoc } from 'firebase/firestore'

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
const DA = 'Gabriele'
const A = 'Masa'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

const BATCH_MAX = 500

async function scriviBatch(nomeCollezione, docsArray, campiAggiornati) {
  for (let i = 0; i < docsArray.length; i += BATCH_MAX) {
    const gruppo = docsArray.slice(i, i + BATCH_MAX)
    const batch = writeBatch(db)
    gruppo.forEach((d) => batch.update(doc(db, nomeCollezione, d.id), campiAggiornati(d)))
    await batch.commit()
    console.log(`  scritto batch di ${gruppo.length} documenti in "${nomeCollezione}"`)
  }
}

async function main() {
  console.log(scrivi ? 'Modalità: SCRITTURA (--write)' : 'Modalità: DRY-RUN (nessuna scrittura)')
  console.log(`Progetto Firestore: ${firebaseConfig.projectId}`)
  console.log('')

  await signInAnonymously(auth)

  // Documento anagrafico tracciatore
  const traccSnap = await getDocs(query(collection(db, 'tracciatori'), where('nome', '==', DA)))
  console.log(`tracciatori: ${traccSnap.size} documenti con nome == "${DA}"`)
  traccSnap.docs.forEach((d) => console.log(`  id: ${d.id}, data: ${JSON.stringify(d.data())}`))

  // Boulder
  const boulderSnap = await getDocs(query(collection(db, 'boulder'), where('tracciatoreNome', '==', DA)))
  console.log(`boulder: ${boulderSnap.size} documenti con tracciatoreNome == "${DA}"`)
  boulderSnap.docs.slice(0, 3).forEach((d) => console.log('  esempio id:', d.id))

  // Storico: tracciatoreNome
  const storicoTraccSnap = await getDocs(query(collection(db, 'storico'), where('tracciatoreNome', '==', DA)))
  console.log(`storico: ${storicoTraccSnap.size} documenti con tracciatoreNome == "${DA}"`)
  storicoTraccSnap.docs.slice(0, 3).forEach((d) => console.log('  esempio id:', d.id))

  // Storico: eseguitoDaNome
  const storicoEseguitoSnap = await getDocs(query(collection(db, 'storico'), where('eseguitoDaNome', '==', DA)))
  console.log(`storico: ${storicoEseguitoSnap.size} documenti con eseguitoDaNome == "${DA}"`)
  storicoEseguitoSnap.docs.slice(0, 3).forEach((d) => console.log('  esempio id:', d.id))

  // Unione dei documenti storico da toccare (un doc può comparire in entrambe le query)
  const storicoDaAggiornare = new Map()
  storicoTraccSnap.docs.forEach((d) => storicoDaAggiornare.set(d.id, d))
  storicoEseguitoSnap.docs.forEach((d) => storicoDaAggiornare.set(d.id, d))
  console.log(`storico: ${storicoDaAggiornare.size} documenti totali da aggiornare (unione dei due campi)`)
  console.log('')

  if (!scrivi) {
    console.log('Dry-run completato. Rilancia con --write per applicare la scrittura.')
    return
  }

  console.log('Autenticato in modo anonimo, avvio scrittura...')

  // La scrittura su `tracciatori` richiede isAdmin() (vedi firestore.rules),
  // che le regole derivano SEMPRE dal collegamento live in tracciatoriByUid.
  // Colleghiamo temporaneamente l'uid anonimo di questo script al
  // tracciatore Gabriele (stesso meccanismo di "scegli il tuo nome" usato
  // da LoginScreen/useAuth.js — nessun bypass delle regole), poi rimuoviamo
  // il collegamento fittizio a fine script.
  const gabrieleId = traccSnap.docs[0]?.id
  let uidTemporaneo = null
  if (gabrieleId) {
    uidTemporaneo = auth.currentUser.uid
    await setDoc(doc(db, 'tracciatoriByUid', uidTemporaneo), { tracciatoreId: gabrieleId })
    console.log(`  collegato temporaneamente uid script (${uidTemporaneo}) a tracciatore Gabriele per ottenere i permessi admin`)
  }

  try {
    // 1. Anagrafica tracciatore
    if (traccSnap.size > 0) {
      const batch = writeBatch(db)
      traccSnap.docs.forEach((d) => batch.update(doc(db, 'tracciatori', d.id), { nome: A }))
      await batch.commit()
      console.log(`  aggiornato documento "tracciatori" (${traccSnap.size})`)
    }

    // 2. boulder.tracciatoreNome
    await scriviBatch('boulder', boulderSnap.docs, () => ({ tracciatoreNome: A }))

    // 3. storico: tracciatoreNome e/o eseguitoDaNome, a seconda di cosa ha ciascun doc
    const storicoTraccIds = new Set(storicoTraccSnap.docs.map((d) => d.id))
    const storicoEseguitoIds = new Set(storicoEseguitoSnap.docs.map((d) => d.id))
    await scriviBatch('storico', Array.from(storicoDaAggiornare.values()), (d) => {
      const campi = {}
      if (storicoTraccIds.has(d.id)) campi.tracciatoreNome = A
      if (storicoEseguitoIds.has(d.id)) campi.eseguitoDaNome = A
      return campi
    })
  } finally {
    if (uidTemporaneo) {
      await deleteDoc(doc(db, 'tracciatoriByUid', uidTemporaneo))
      console.log(`  rimosso collegamento temporaneo uid script -> Gabriele/Masa`)
    }
  }

  console.log('')
  console.log('Migrazione completata.')
}

main()
  .catch((e) => {
    console.error('Errore durante la migrazione:', e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
