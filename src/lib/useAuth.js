import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'
import { auth, db } from './firebase'

// Come funziona il login qui, diversamente da Supabase:
// - Ogni device ottiene automaticamente un'identità Firebase "anonima"
//   (nessuna password, gestita da Firebase stesso, persistente nel browser).
// - Essere autenticati anche solo in modo anonimo è già sufficiente, secondo
//   le Firestore Security Rules, per poter scrivere boulder/storico.
// - "Scegliere il proprio nome" collega quell'identità anonima (uid) a uno
//   dei tracciatori fissi della lista, scrivendo in tracciatoriByUid/{uid}.
//   Questo collegamento è quello che l'app legge per sapere "chi sei" e per
//   verificare i permessi admin (vedi firestore.rules).
export function useAuth() {
  const [uid, setUid] = useState(null)
  const [tracciatore, setTracciatore] = useState(null) // { id, nome, isAdmin } | null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const caricaTracciatoreDaUid = useCallback(async (currentUid) => {
    try {
      const linkSnap = await getDoc(doc(db, 'tracciatoriByUid', currentUid))
      if (!linkSnap.exists()) {
        setTracciatore(null)
        return
      }
      const { tracciatoreId } = linkSnap.data()
      const tSnap = await getDoc(doc(db, 'tracciatori', tracciatoreId))
      setTracciatore(tSnap.exists() ? { id: tSnap.id, ...tSnap.data() } : null)
    } catch {
      setError('Connessione assente, riprova.')
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth)
        } catch {
          setError('Connessione assente, riprova.')
          setLoading(false)
        }
        return // onAuthStateChanged si ritriggererà con lo user anonimo appena creato
      }
      setUid(user.uid)
      await caricaTracciatoreDaUid(user.uid)
      setLoading(false)
    })
    return unsub
  }, [caricaTracciatoreDaUid])

  const login = useCallback(async (nome) => {
    setError(null)
    if (!uid) return false
    try {
      const q = query(collection(db, 'tracciatori'), where('nome', '==', nome), limit(1))
      const snap = await getDocs(q)
      if (snap.empty) {
        setError('Tracciatore non trovato.')
        return false
      }
      const tracciatoreId = snap.docs[0].id
      await setDoc(doc(db, 'tracciatoriByUid', uid), { tracciatoreId })
      await caricaTracciatoreDaUid(uid)
      return true
    } catch {
      setError('Connessione assente, riprova.')
      return false
    }
  }, [uid, caricaTracciatoreDaUid])

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      setTracciatore(null)
      // onAuthStateChanged farà ripartire una nuova sessione anonima "pulita"
    } catch {
      setError('Connessione assente, riprova.')
    }
  }, [])

  return { tracciatore, loading, error, login, logout }
}
