// Imposta o ruota la password condivisa usata da tutti i tracciatori per
// ottenere diritti di scrittura (vedi passwordSbloccata() in
// firestore.rules e src/lib/useAuth.js).
//
// Perché questo script usa l'Admin SDK (firebase-admin) invece del client
// SDK come gli altri script in questa cartella:
// config/authGate — il documento che contiene l'hash della password — ha
// `allow read, write: if false` per QUALSIASI client, admin compreso.
// È una scelta voluta: se un client (anche autenticato come admin) potesse
// scriverlo, la password condivisa sarebbe protetta solo quanto lo è oggi
// l'account admin, e non ci sarebbe modo di impostare la primissima
// password senza che esista già... la password stessa (problema uovo e
// gallina). L'Admin SDK bypassa le Security Rules per definizione: è
// pensato per essere eseguito solo da chi ha già accesso al progetto
// Firebase (Masa), mai dal client dell'app.
//
// Setup una tantum (richiede il tuo account Google collegato al progetto
// Firebase, nessun costo aggiuntivo, resta sul piano Spark):
//   1. Firebase Console → Project Settings (ingranaggio) → tab
//      "Service accounts" → "Generate new private key" → conferma.
//      Si scarica un file .json: NON va mai committato (è già escluso da
//      .gitignore se lo chiami "serviceAccountKey.json" o simile).
//   2. Salvalo da qualche parte fuori dal repo, o dentro al repo con un
//      nome che matcha .gitignore, es. `serviceAccountKey.json` nella
//      root del progetto.
//   3. `npm install` (installa firebase-admin, già in package.json).
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//     node scripts/set-shared-password.mjs "nuova-password-condivisa"
//
// Nota: cambiare la password qui NON invalida gli sblocchi già ottenuti
// dai device (unlockAttempts/{uid} resta valido finché quel device non fa
// logout) — è una rotazione "per il futuro", non una revoca immediata.
// Per revocare l'accesso a un device specifico, cancella a mano il suo
// documento in unlockAttempts dalla Firestore Console.
import { createHash } from 'node:crypto'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const nuovaPassword = process.argv[2]

if (!nuovaPassword) {
  console.error('Uso: node scripts/set-shared-password.mjs "nuova-password-condivisa"')
  process.exit(1)
}
if (nuovaPassword.length < 8) {
  console.error('Password troppo corta: usa una passphrase più lunga (es. "corda-e-magnesite-24"), non un PIN.')
  process.exit(1)
}

const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credentialPath) {
  console.error(
    'Manca GOOGLE_APPLICATION_CREDENTIALS: imposta il percorso del file service account key scaricato dalla Firebase Console (vedi commento in testa a questo script).'
  )
  process.exit(1)
}

// Stesso algoritmo di src/lib/hash.js (SHA-256, hex minuscolo): il client
// e questo script devono produrre esattamente lo stesso hash per la stessa
// password.
function sha256Hex(testo) {
  return createHash('sha256').update(testo, 'utf8').digest('hex')
}

const app = initializeApp({ credential: applicationDefault() })
const db = getFirestore(app)

async function main() {
  const passwordHash = sha256Hex(nuovaPassword)
  await db.doc('config/authGate').set({ passwordHash, aggiornatoIl: new Date().toISOString() })
  console.log('Password condivisa aggiornata.')
  console.log('Hash salvato in config/authGate (mai leggibile dai client, vedi firestore.rules).')
}

main()
  .catch((e) => {
    console.error('Errore durante la scrittura:', e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
