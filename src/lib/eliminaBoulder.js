import { doc, deleteDoc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const VENTIQUATTRO_ORE_MS = 24 * 60 * 60 * 1000

// Entro 24 ore dalla creazione: cancellazione reale (boulder + tutto il suo
// storico), come se non fosse mai esistito — utile per correggere un
// inserimento sbagliato appena fatto.
// Oltre le 24 ore: soft-delete (stato: 'rimossa'). Il boulder sparisce dalle
// liste "attivi" ma lo storico resta intatto e continua a contare nelle
// statistiche/classifica/CSV, perché a quel punto è tracciamento reale già
// avvenuto, non una svista da annullare.
// Se manca un timestamp di creazione affidabile (boulder storici pre-esistenti),
// si tratta sempre come "oltre le 24 ore" → soft-delete, mai cancellazione reale.
export async function eliminaBoulder(boulder, tracciatoreNome) {
  const creatoIlDate = boulder.creatoIl?.toDate ? boulder.creatoIl.toDate() : null
  const entroFinestra = creatoIlDate && Date.now() - creatoIlDate.getTime() < VENTIQUATTRO_ORE_MS

  if (entroFinestra) {
    const batch = writeBatch(db)
    batch.delete(doc(db, 'boulder', boulder.id))
    const storicoSnap = await getDocs(query(collection(db, 'storico'), where('boulderId', '==', boulder.id)))
    storicoSnap.forEach((s) => batch.delete(s.ref))
    await batch.commit()
  } else {
    // rimossoDa/rimossoIl alimentano la pagina Cestino (chi e quando), e
    // rimossoIl è anche il riferimento per la pulizia automatica dopo 7
    // giorni (vedi Cestino.jsx).
    await updateDoc(doc(db, 'boulder', boulder.id), {
      stato: 'rimossa',
      rimossoDa: tracciatoreNome || null,
      rimossoIl: serverTimestamp(),
    })
  }
}
