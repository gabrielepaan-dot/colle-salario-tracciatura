import { useEffect, useRef, useState } from 'react'
import { eliminaBoulder } from './eliminaBoulder'

const DURATA_ANNULLA_MS = 4500

// Stato condiviso del flusso "cestino → conferma → elimina", usato identico
// da Dettaglio settore e dalla vista Filtri per non duplicare la logica.
//
// La cancellazione vera e propria è ritardata: alla conferma il boulder
// sparisce subito dalla UI (il chiamante lo nasconde confrontando il suo id
// con inAttesaAnnulla) e parte un timer durante il quale un toast permette
// di annullare senza che sia mai scritto nulla su Firestore. Solo allo
// scadere del timer si esegue la cancellazione reale (logica invariata in
// eliminaBoulder.js).
export function useCancellazioneBoulder(onCompletata, tracciatoreLoggato) {
  const [daEliminare, setDaEliminare] = useState(null)
  const [inAttesaAnnulla, setInAttesaAnnulla] = useState(null)
  const [erroreEliminazione, setErroreEliminazione] = useState(null)
  const timeoutRef = useRef(null)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function richiediEliminazione(boulder) {
    setErroreEliminazione(null)
    setDaEliminare(boulder)
  }

  function annulla() {
    setDaEliminare(null)
  }

  async function eseguiEliminazione(boulder) {
    try {
      await eliminaBoulder(boulder, tracciatoreLoggato?.nome)
      onCompletata()
    } catch (e) {
      setErroreEliminazione('Connessione assente, riprova. Se il problema persiste la rimozione non è andata a buon fine.')
      console.error(e)
    }
  }

  function conferma() {
    if (!daEliminare) return
    const boulder = daEliminare
    setDaEliminare(null)
    setErroreEliminazione(null)

    // Una cancellazione già in attesa di "Annulla" viene eseguita subito:
    // altrimenti il suo timer verrebbe sovrascritto e non scatterebbe mai.
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      eseguiEliminazione(inAttesaAnnulla)
    }

    setInAttesaAnnulla(boulder)
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      setInAttesaAnnulla(null)
      eseguiEliminazione(boulder)
    }, DURATA_ANNULLA_MS)
  }

  function annullaEliminazione() {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    setInAttesaAnnulla(null)
  }

  return {
    daEliminare,
    inAttesaAnnulla,
    erroreEliminazione,
    richiediEliminazione,
    annulla,
    conferma,
    annullaEliminazione,
  }
}
