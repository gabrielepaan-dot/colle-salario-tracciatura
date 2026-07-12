import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function AdminPanel() {
  const [tracciatori, setTracciatori] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [nuovoNome, setNuovoNome] = useState('')
  const [azioneInCorso, setAzioneInCorso] = useState(null) // id o 'nuovo' durante un'operazione

  const carica = useCallback(async () => {
    setCaricamento(true)
    setErrore(null)
    try {
      const snap = await getDocs(collection(db, 'tracciatori'))
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      lista.sort((a, b) => a.nome.localeCompare(b.nome))
      setTracciatori(lista)
    } catch {
      setErrore('Connessione assente, riprova.')
    }
    setCaricamento(false)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  async function aggiungiTracciatore() {
    const nome = nuovoNome.trim()
    if (!nome) return
    setAzioneInCorso('nuovo')
    setErrore(null)
    try {
      // Firestore non ha vincoli di unicità: controlliamo prima noi lato client.
      const q = query(collection(db, 'tracciatori'), where('nome', '==', nome), limit(1))
      const esistente = await getDocs(q)
      if (!esistente.empty) {
        setErrore('Esiste già un tracciatore con questo nome.')
      } else {
        await addDoc(collection(db, 'tracciatori'), { nome, isAdmin: false })
        setNuovoNome('')
        await carica()
      }
    } catch {
      setErrore('Connessione assente, riprova.')
    }
    setAzioneInCorso(null)
  }

  async function rimuoviTracciatore(t) {
    if (!confirm(`Rimuovere ${t.nome} dalla lista? Non sarà più selezionabile per il login. Lo storico che lo cita resterà comunque leggibile con il suo nome.`)) return
    setAzioneInCorso(t.id)
    setErrore(null)
    try {
      await deleteDoc(doc(db, 'tracciatori', t.id))
      await carica()
    } catch {
      setErrore('Connessione assente, riprova.')
    }
    setAzioneInCorso(null)
  }

  async function toggleAdmin(t) {
    setAzioneInCorso(t.id)
    setErrore(null)
    try {
      await updateDoc(doc(db, 'tracciatori', t.id), { isAdmin: !t.isAdmin })
      await carica()
    } catch {
      setErrore('Connessione assente, riprova.')
    }
    setAzioneInCorso(null)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <h2 className="font-bold text-navy text-sm mb-1">Gestione tracciatori</h2>
      <p className="text-xs text-gray-400 mb-3">Solo admin</p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={nuovoNome}
          onChange={(e) => setNuovoNome(e.target.value)}
          placeholder="Nome nuovo tracciatore"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
        />
        <button
          onClick={aggiungiTracciatore}
          disabled={azioneInCorso !== null || !nuovoNome.trim()}
          className="px-4 py-2 rounded-lg bg-navy text-white text-sm disabled:opacity-40"
        >
          {azioneInCorso === 'nuovo' ? '...' : 'Aggiungi'}
        </button>
      </div>

      {caricamento && <p className="text-gray-400 text-sm">Caricamento...</p>}

      {!caricamento && (
        <div className="flex flex-col gap-2">
          {tracciatori.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-2 border-t border-gray-100 first:border-t-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{t.nome}</p>
                {t.isAdmin && <p className="text-xs text-verde">admin</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAdmin(t)}
                  disabled={azioneInCorso !== null}
                  className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  {t.isAdmin ? 'Togli admin' : 'Rendi admin'}
                </button>
                <button
                  onClick={() => rimuoviTracciatore(t)}
                  disabled={azioneInCorso !== null}
                  className="text-xs px-2 py-1 rounded-full border border-rosso text-rosso disabled:opacity-40"
                >
                  Rimuovi
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {errore && <p className="text-rosso text-sm mt-3">{errore}</p>}
    </div>
  )
}
