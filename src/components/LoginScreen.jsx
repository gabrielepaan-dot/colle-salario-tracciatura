import { useState, useEffect } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'

// nomeFisso: quando presente (device già collegato a un tracciatore prima
// dell'introduzione della password condivisa, ma non ancora sbloccato su
// questo device) si salta la griglia nomi e si chiede subito la password.
export default function LoginScreen({ onLogin, onUnlock, loginError, nomeFisso }) {
  const [nomi, setNomi] = useState([])
  const [caricamento, setCaricamento] = useState(!nomeFisso)
  const [erroreCaricamento, setErroreCaricamento] = useState(null)
  const [nomeInCorso, setNomeInCorso] = useState(null) // per stato "sto entrando..."
  const [fase, setFase] = useState(nomeFisso ? 'password' : 'nomi')
  const [nomeScelto, setNomeScelto] = useState(nomeFisso || null)
  const [password, setPassword] = useState('')
  const [invioInCorso, setInvioInCorso] = useState(false)

  useEffect(() => {
    if (nomeFisso) return
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
  }, [nomeFisso])

  async function handleScelta(nome) {
    setNomeInCorso(nome)
    const risultato = await onLogin(nome)
    setNomeInCorso(null)
    if (risultato === 'needs-password') {
      setNomeScelto(nome)
      setFase('password')
    }
  }

  async function handleSubmitPassword(e) {
    e.preventDefault()
    setInvioInCorso(true)
    const ok = await onUnlock(password)
    setInvioInCorso(false)
    if (!ok) setPassword('')
  }

  if (fase === 'password') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gray-50">
        <img src="/colle-salario-tracciatura/logo.svg" alt="" className="w-16 h-16" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-navy">
            {nomeScelto ? `Ciao ${nomeScelto}` : 'Password'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Inserisci la password condivisa per tracciare</p>
        </div>

        <form onSubmit={handleSubmitPassword} className="w-full max-w-sm flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password condivisa"
            autoFocus
            disabled={invioInCorso}
            className="px-4 py-3 rounded-xl bg-white border border-gray-200 text-navy
                       shadow-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={invioInCorso || !password}
            className="px-4 py-3 rounded-xl bg-navy text-white font-medium
                       shadow-sm active:scale-95 transition disabled:opacity-50"
          >
            {invioInCorso ? 'Verifico...' : 'Entra'}
          </button>
          {!nomeFisso && (
            <button
              type="button"
              onClick={() => { setFase('nomi'); setPassword('') }}
              disabled={invioInCorso}
              className="text-sm text-gray-400 underline self-center"
            >
              Indietro
            </button>
          )}
        </form>

        {loginError && (
          <p className="text-rosso text-sm text-center">{loginError}</p>
        )}
      </div>
    )
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
