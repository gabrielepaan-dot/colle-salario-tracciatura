import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore'
import { auth, db } from './firebase'
import { sha256Hex } from './hash'

const MAX_TENTATIVI = 5
const FINESTRA_BLOCCO_MS = 15 * 60 * 1000

function msDaTimestamp(ts) {
  return ts?.toMillis?.() ?? 0
}

// Come funziona il login qui, diversamente da Supabase:
// - Ogni device ottiene automaticamente un'identità Firebase "anonima"
//   (nessuna password, gestita da Firebase stesso, persistente nel browser).
// - Essere autenticati anche solo in modo anonimo NON è più sufficiente per
//   scrivere: serve anche aver dimostrato di conoscere la password
//   condivisa, scrivendo con successo unlockAttempts/{uid} (vedi
//   passwordSbloccata() in firestore.rules). Questo accade una sola volta
//   per device, finché non si fa logout.
// - "Scegliere il proprio nome" collega quell'identità anonima (uid) a uno
//   dei tracciatori fissi della lista, scrivendo in tracciatoriByUid/{uid}.
//   Questo collegamento è quello che l'app legge per sapere "chi sei" e per
//   verificare i permessi admin (vedi firestore.rules) — ed è anch'esso
//   protetto dallo stesso gate della password.
export function useAuth() {
  const [uid, setUid] = useState(null)
  const [tracciatore, setTracciatore] = useState(null) // { id, nome, isAdmin } | null
  const [unlocked, setUnlocked] = useState(false) // ha già superato il gate password su questo device?
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nomeInSospeso, setNomeInSospeso] = useState(null) // nome scelto ma in attesa della password

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

  const caricaStatoSblocco = useCallback(async (currentUid) => {
    try {
      const snap = await getDoc(doc(db, 'unlockAttempts', currentUid))
      setUnlocked(snap.exists())
    } catch {
      setUnlocked(false)
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
      await Promise.all([caricaTracciatoreDaUid(user.uid), caricaStatoSblocco(user.uid)])
      setLoading(false)
    })
    return unsub
  }, [caricaTracciatoreDaUid, caricaStatoSblocco])

  // Ritorna true (successo), false (nome inesistente o errore di
  // connessione, dettaglio in `error`) oppure 'needs-password' se il device
  // non ha ancora superato il gate della password condivisa.
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
      setNomeInSospeso(null)
      return true
    } catch (e) {
      if (e.code === 'permission-denied') {
        setNomeInSospeso(nome)
        return 'needs-password'
      }
      setError('Connessione assente, riprova.')
      return false
    }
  }, [uid, caricaTracciatoreDaUid])

  // Registra un tentativo fallito scrivendo direttamente su
  // unlockAttempts/{uid} (non più una collection separata: le Rules
  // impongono che l'incremento del contatore avvenga nella STESSA scrittura
  // che tenta l'hash, vedi firestore.rules — impossibile "provare" un hash
  // senza che Firestore stesso lo contabilizzi). Stessa aritmetica
  // anti-reset di prima: incrementa, oppure riparte da 1 se la finestra di
  // blocco precedente (>=5 fallimenti da oltre 15 minuti) è scaduta davvero.
  const registraFallimento = useCallback(async (currentUid, hashSbagliato, statoAttuale) => {
    let nuovoCount = 1
    if (statoAttuale) {
      const { tentativi = 0, ts } = statoAttuale
      const trascorsi = Date.now() - msDaTimestamp(ts)
      const finestraScaduta = tentativi >= MAX_TENTATIVI && trascorsi >= FINESTRA_BLOCCO_MS
      nuovoCount = finestraScaduta ? 1 : tentativi + 1
    }
    try {
      await setDoc(doc(db, 'unlockAttempts', currentUid), {
        passwordHash: hashSbagliato,
        tentativi: nuovoCount,
        ts: serverTimestamp(),
      })
    } catch {
      // Se anche questa scrittura viene rifiutata (es. rate limit scattato
      // nel frattempo), il messaggio sotto resta comunque corretto.
    }
    if (nuovoCount >= MAX_TENTATIVI) {
      setError('Password errata. Troppi tentativi falliti: riprova tra 15 minuti.')
    } else {
      setError(`Password errata. Tentativi rimasti: ${MAX_TENTATIVI - nuovoCount}.`)
    }
  }, [])

  // Verifica la password condivisa scrivendo unlockAttempts/{uid} (fallisce
  // con permission-denied se sbagliata, vedi firestore.rules). Prima ancora
  // di tentare, legge lo stato attuale: se il device è già bloccato per
  // troppi fallimenti recenti, non tenta nemmeno la scrittura. Su successo,
  // il contatore fallimenti torna a 0 nella stessa scrittura (non serve più
  // una delete separata) e, se c'era una scelta di nome in sospeso, la
  // completa automaticamente.
  const unlock = useCallback(async (password) => {
    setError(null)
    if (!uid) return false
    const ref = doc(db, 'unlockAttempts', uid)
    try {
      const snap = await getDoc(ref)
      const statoAttuale = snap.exists() ? snap.data() : null
      if (statoAttuale) {
        const { tentativi = 0, ts } = statoAttuale
        const trascorsi = Date.now() - msDaTimestamp(ts)
        if (tentativi >= MAX_TENTATIVI && trascorsi < FINESTRA_BLOCCO_MS) {
          const minuti = Math.ceil((FINESTRA_BLOCCO_MS - trascorsi) / 60000)
          setError(`Troppi tentativi falliti. Riprova tra ${minuti} minut${minuti === 1 ? 'o' : 'i'}.`)
          return false
        }
      }

      const passwordHash = await sha256Hex(password)
      try {
        await setDoc(ref, { passwordHash, tentativi: 0, ts: serverTimestamp() })
      } catch (e) {
        if (e.code === 'permission-denied') {
          await registraFallimento(uid, passwordHash, statoAttuale)
          return false
        }
        throw e
      }
      setUnlocked(true)
      if (nomeInSospeso) {
        const risultato = await login(nomeInSospeso)
        return risultato === true
      }
      return true
    } catch {
      setError('Connessione assente, riprova.')
      return false
    }
  }, [uid, nomeInSospeso, login, registraFallimento])

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      setTracciatore(null)
      setUnlocked(false)
      setNomeInSospeso(null)
      // onAuthStateChanged farà ripartire una nuova sessione anonima "pulita"
    } catch {
      setError('Connessione assente, riprova.')
    }
  }, [])

  return { tracciatore, unlocked, loading, error, login, unlock, logout }
}
