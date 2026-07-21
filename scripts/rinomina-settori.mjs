// Migrazione one-off: rinomina due settori boulder ovunque siano salvati
// come stringa denormalizzata (`settore` in `boulder` e in `storico`).
//   'Tetto dx (giallo)'    -> 'Strapiombo giallo'
//   'Torre bassa arancio'  -> 'Torre bassa'
//
// Usa l'Admin SDK (firebase-admin), non il client SDK come
// rename-gabriele-to-masa.mjs: le Rules attuali richiedono
// `eseguitoDaUid == request.auth.uid` su ogni update di `storico`
// (vedi firestore.rules), quindi un client autenticato con un solo uid
// non potrebbe aggiornare documenti scritti da uid diversi. L'Admin SDK
// bypassa le Security Rules per definizione (stesso motivo/pattern di
// set-shared-password.mjs) ed evita qualunque workaround fragile di
// auto-elevazione a admin.
//
// Setup: stesso di set-shared-password.mjs (service account key scaricata
// da Firebase Console > Project Settings > Service accounts).
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//     node scripts/rinomina-settori.mjs            → dry-run, stampa solo i conteggi
//   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
//     node scripts/rinomina-settori.mjs --write     → scrive davvero (dopo aver
//                                                      controllato l'esito del dry-run)
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!credentialPath) {
  console.error(
    'Manca GOOGLE_APPLICATION_CREDENTIALS: imposta il percorso del file service account key scaricato dalla Firebase Console (vedi commento in testa a set-shared-password.mjs).'
  )
  process.exit(1)
}

const scrivi = process.argv.includes('--write')

const RINOMINE = [
  { da: 'Tetto dx (giallo)', a: 'Strapiombo giallo' },
  { da: 'Torre bassa arancio', a: 'Torre bassa' },
]

const COLLEZIONI = ['boulder', 'storico']

const app = initializeApp({ credential: applicationDefault() })
const db = getFirestore(app)

const BATCH_MAX = 500

async function scriviBatch(nomeCollezione, docsArray, settoreNuovo) {
  for (let i = 0; i < docsArray.length; i += BATCH_MAX) {
    const gruppo = docsArray.slice(i, i + BATCH_MAX)
    const batch = db.batch()
    gruppo.forEach((d) => batch.update(d.ref, { settore: settoreNuovo }))
    await batch.commit()
    console.log(`  scritto batch di ${gruppo.length} documenti in "${nomeCollezione}"`)
  }
}

async function main() {
  console.log(scrivi ? 'Modalità: SCRITTURA (--write)' : 'Modalità: DRY-RUN (nessuna scrittura)')
  console.log('')

  // Mappa: per ogni rinomina, per ogni collezione, i documenti trovati.
  const trovati = new Map() // chiave `${da}::${collezione}` -> array di docSnap

  for (const { da, a } of RINOMINE) {
    console.log(`=== "${da}" -> "${a}" ===`)
    for (const collezione of COLLEZIONI) {
      const snap = await db.collection(collezione).where('settore', '==', da).get()
      console.log(`  ${collezione}: ${snap.size} documenti con settore == "${da}"`)
      snap.docs.slice(0, 3).forEach((d) => console.log(`    esempio id: ${d.id}`))
      trovati.set(`${da}::${collezione}`, snap.docs)
    }
    console.log('')
  }

  if (!scrivi) {
    console.log('Dry-run completato. Rilancia con --write per applicare la scrittura.')
    return
  }

  console.log('Avvio scrittura...')
  console.log('')

  const riepilogo = []
  for (const { da, a } of RINOMINE) {
    for (const collezione of COLLEZIONI) {
      const docs = trovati.get(`${da}::${collezione}`)
      if (docs.length === 0) continue
      console.log(`--- ${collezione}: "${da}" -> "${a}" ---`)
      await scriviBatch(collezione, docs, a)
      riepilogo.push({ collezione, da, a, aggiornati: docs.length })
    }
  }

  console.log('')
  console.log('Riepilogo finale:')
  if (riepilogo.length === 0) {
    console.log('  nessun documento aggiornato (nessuna corrispondenza trovata).')
  } else {
    riepilogo.forEach((r) =>
      console.log(`  ${r.collezione}: ${r.aggiornati} documenti aggiornati ("${r.da}" -> "${r.a}")`)
    )
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
