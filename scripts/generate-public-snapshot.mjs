// Genera lo snapshot JSON pubblico letto dalla Vista pubblica (#/pubblico),
// servito staticamente dal branch orfano "public-data" (mai da "main").
//
// Usa l'Admin SDK (firebase-admin), non il client SDK: con Firebase App
// Check in modalità enforcement, le letture del client SDK richiedono un
// token App Check valido, che questo script (eseguito headless in CI, senza
// browser/reCAPTCHA) non può fornire — verrebbero bloccate. L'Admin SDK
// bypassa App Check nativamente, esattamente come già bypassa le Security
// Rules in set-shared-password.mjs.
//
// Richiede GOOGLE_APPLICATION_CREDENTIALS (percorso a un file service
// account key), stesso meccanismo di set-shared-password.mjs. In CI
// (workflow public-snapshot.yml) il file viene scritto da un secret
// prima di eseguire questo script.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//     node scripts/generate-public-snapshot.mjs [percorso-output.json]
//   (default: ./public-snapshot.json)
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFileSync } from 'node:fs'
import { devePubblicare } from './lib/finestraPubblicazione.mjs'

const percorsoOutput = process.argv[2] || './public-snapshot.json'

// Solo i campi utili al pubblico: esclusi id documento, tracciatoreId, note,
// stato, creatoIl, rimossoDa/rimossoIl (nessun campo gestionale/interno).
function campiPubblici(doc) {
  return {
    settore: doc.settore,
    tipo: doc.tipo,
    colorePrese: doc.colorePrese,
    coloreGrado: doc.coloreGrado || '',
    old: !!doc.old,
    permanente: !!doc.permanente,
    tracciatoreNome: doc.tracciatoreNome || '',
    dataUltimoCambio: doc.dataUltimoCambio,
  }
}

async function main() {
  // Controllo di fascia oraria PRIMA di toccare credenziali/Firestore: la
  // maggior parte delle invocazioni del cron (che triggera più spesso del
  // necessario) deve limitarsi a questo controllo economico ed uscire,
  // senza consumare quota di lettura Firestore. Vedi lib/finestraPubblicazione.mjs.
  const decisione = await devePubblicare()
  if (!decisione.pubblica) {
    console.log(`Nessuna pubblicazione: ${decisione.motivo}.`)
    return
  }
  console.log(`Pubblico nuovo snapshot: ${decisione.motivo}.`)

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credentialPath) {
    console.error(
      'Manca GOOGLE_APPLICATION_CREDENTIALS: imposta il percorso del file service account key (vedi commento in testa a questo script).'
    )
    process.exit(1)
  }

  const app = initializeApp({ credential: applicationDefault() })
  const db = getFirestore(app)

  const snap = await db.collection('boulder').where('stato', '==', 'attiva').get()
  const boulder = snap.docs.map((d) => campiPubblici(d.data()))

  const output = {
    generatoIl: new Date().toISOString(),
    boulder,
  }

  writeFileSync(percorsoOutput, JSON.stringify(output))
  console.log(`Scritto ${percorsoOutput}: ${boulder.length} boulder/vie attivi.`)
}

main()
  .catch((e) => {
    console.error('Errore durante la generazione dello snapshot pubblico:', e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
