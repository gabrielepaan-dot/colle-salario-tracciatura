import { doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

// Unico percorso di rimozione: sempre soft-delete (stato: 'rimossa'). Il
// boulder sparisce dalle liste "attivi" ma storico resta intatto e continua
// a contare nelle statistiche/classifica/CSV. Il ripristino o la
// cancellazione reale avvengono solo dal Cestino (vedi Cestino.jsx).
export async function eliminaBoulder(boulder, tracciatoreLoggato) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'boulder', boulder.id), {
    stato: 'rimossa',
    rimossoDa: tracciatoreLoggato?.id ?? null,
    rimossoDaNome: tracciatoreLoggato?.nome ?? null,
    rimossoIl: serverTimestamp(),
  })
  await batch.commit()
}
