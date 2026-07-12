import { useState, useEffect } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function LoginScreen({ onLogin, loginError }) {
  const [nomi, setNomi] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [erroreCaricamento, setErroreCaricamento] = useState(null)
  const [nomeInCorso, setNomeInCorso] = useState(null) // per stato "sto entrando..."

  useEffect(() => {
    async function caricaNomi() {
      try {
        const q = query(collection(db, 'tracciatori'), orderBy('nome'))
        const snap = await getDocs(q)
        setNomi(snap.docs.map((d) => d.data().nome))
      } catch {
        setErroreCaricamento('Connessione assente, riprova.')
      }
      setCaricamento(false)
    }
    caricaNomi()
  }, [])

  async function handleScelta(nome) {
    setNomeInCorso(nome)
    await onLogin(nome)
    setNomeInCorso(null)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gray-50">
      <img src="/colle-salario-tracciatura/logo.svg" alt="" className="w-16 h-16" />
      <div className="text-center">
        <h1 className="text-xl font-bold text-navy">Chi sei?</h1>
        <p className="text-sm text-gray-500 mt-1">Scegli il tuo nome per poter tracciare</p>
      </div>

      {caricamento && (
        <p className="text-gray-400 text-sm">Caricamento...</p>
      )}

      {erroreCaricamento && (
        <p className="text-rosso text-sm text-center">{erroreCaricamento}</p>
      )}

      {!caricamento && !erroreCaricamento && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {nomi.map((nome) => (
            <button
              key={nome}
              onClick={() => handleScelta(nome)}
              disabled={nomeInCorso !== null}
              className="px-4 py-3 rounded-xl bg-white border border-gray-200 text-navy font-medium
                         shadow-sm active:scale-95 transition
                         disabled:opacity-50
                         hover:border-navy"
            >
              {nomeInCorso === nome ? 'Entro...' : nome}
            </button>
          ))}
        </div>
      )}

      {loginError && (
        <p className="text-rosso text-sm text-center">{loginError}</p>
      )}
    </div>
  )
}
