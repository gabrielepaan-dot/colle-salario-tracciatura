import { useState } from 'react'
import { eliminaBoulder } from './eliminaBoulder'

// Stato condiviso del flusso "cestino → conferma → elimina", usato identico
// da Dettaglio settore e dalla vista Filtri per non duplicare la logica.
export function useCancellazioneBoulder(onCompletata) {
  const [daEliminare, setDaEliminare] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [erroreEliminazione, setErroreEliminazione] = useState(null)

  function richiediEliminazione(boulder) {
    setErroreEliminazione(null)
    setDaEliminare(boulder)
  }

  function annulla() {
    if (eliminando) return
    setDaEliminare(null)
  }

  async function conferma() {
    if (!daEliminare) return
    setEliminando(true)
    setErroreEliminazione(null)
    try {
      await eliminaBoulder(daEliminare)
      setDaEliminare(null)
      onCompletata()
    } catch (e) {
      setErroreEliminazione('Connessione assente, riprova. Se il problema persiste la rimozione non è andata a buon fine.')
      console.error(e)
    }
    setEliminando(false)
  }

  return { daEliminare, eliminando, erroreEliminazione, richiediEliminazione, annulla, conferma }
}
