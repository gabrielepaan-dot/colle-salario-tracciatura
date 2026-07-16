import { useCallback, useEffect, useState } from 'react'

// Servito dal branch orfano "public-data" (mai da "main"), rigenerato ogni
// ~15 minuti da .github/workflows/public-snapshot.yml. raw.githubusercontent.com
// invia Access-Control-Allow-Origin: *, quindi il fetch cross-origin da
// GitHub Pages funziona senza proxy.
const SNAPSHOT_URL =
  'https://raw.githubusercontent.com/gabrielepaan-dot/colle-salario-tracciatura/public-data/public-snapshot.json'

// Vista pubblica (#/pubblico): legge solo questo JSON statico, mai
// Firestore direttamente, per non generare letture dal traffico dei
// visitatori (vedi spec "Vista pubblica read-only").
export function usePubblicoSnapshot() {
  const [dati, setDati] = useState(null)
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)

  const carica = useCallback(async () => {
    setCaricamento(true)
    setErrore(null)
    try {
      const res = await fetch(SNAPSHOT_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setDati(json)
    } catch (e) {
      setErrore('Dati non disponibili al momento. Riprova tra poco.')
      console.error(e)
    }
    setCaricamento(false)
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  return { dati, caricamento, errore, ricarica: carica }
}
