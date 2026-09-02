import { useState, useEffect } from 'react'
import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../lib/firebase'
import { dataEffettiva } from '../lib/date'
import {
  LISTA_SETTORI,
  LISTA_SETTORI_CORDA,
  LISTA_COLORI_PRESE,
  LISTA_COLORI_GRADO,
  COLORI_PRESE,
  COLORI_SPECIALI,
  LISTA_COLORI_SPECIALI,
  isColoreSpeciale,
  supportaOld,
  nomeColorePrese,
  sfondoColorePrese,
  testoPerColorePrese,
  hexRappresentativo,
} from '../lib/colori'
import GradoStar from './GradoStar'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function primaLettera(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Valore locale usato per la chip "Altri" (tracciatore occasionale, non tra
// i fissi): non è un id Firestore reale, va tradotto in tracciatoreId: null
// e tracciatoreNome: "Altri" al momento del salvataggio.
const TRACCIATORE_ALTRI = '__altri__'

// Etichette "a fascia" per i due campi più importanti e più facili da
// confondere (colore prese vs grado): sfondo pieno, grassetto, un filo più
// grandi delle altre label del form, con due tinte diverse per distinguerli
// a colpo d'occhio. Le altre label (settore, data, note, tracciatore)
// restano piccole e grigie di proposito, così questi due risaltano.
const LABEL_PRESE =
  'block text-sm font-bold uppercase tracking-wide text-gray-700 bg-gray-100 rounded-lg px-2.5 py-2 mb-2.5'
const LABEL_GRADO =
  'block text-sm font-bold uppercase tracking-wide text-navy bg-[#E6ECFB] rounded-lg px-2.5 py-2 mb-2.5'

// Titolo del pannello quando è aperto su un solo campo (vedi prop `campo`).
const TITOLO_CAMPO = {
  colorePrese: 'Colore prese',
  coloreGrado: 'Grado',
  tracciatore: 'Tracciatore',
  data: 'Data',
  note: 'Note',
}

// mode: 'create' | 'update'
// boulderEsistente: { id, settore, colorePrese, coloreGrado, stato, note, dataUltimoCambio } — richiesto se mode === 'update'
// settoreIniziale: string — usato solo se mode === 'create' (settore già scelto, es. da un filtro attivo)
// tipo: 'boulder' | 'corda' — contesto da cui è stato aperto il form: determina la
// lista settori mostrata in creazione e il campo `tipo` salvato sui nuovi documenti.
// In modifica non viene mai usato per cambiare il tipo di un boulder/corda esistente.
// campo: 'colorePrese' | 'coloreGrado' | 'tracciatore' | 'data' | 'note' — solo in
// modifica: apre il pannello sul SOLO campo toccato nella riga, invece che su tutto.
// Toccare il grado e ritrovarsi davanti la griglia dei colori prese portava a
// cambiare per sbaglio il campo sbagliato. Gli altri valori restano comunque negli
// stati inizializzati da boulderEsistente, quindi il salvataggio li riscrive
// identici: la logica di salvataggio qui sotto non cambia in base a `campo`.
export default function BoulderForm({
  mode,
  boulderEsistente,
  settoreIniziale,
  tipo,
  campo,
  tracciatoreLoggato,
  tracciatori,
  permanenteDefault,
  onClose,
  onSalvato,
}) {
  const listaSettori = tipo === 'corda' ? LISTA_SETTORI_CORDA : LISTA_SETTORI
  const [settore, setSettore] = useState(boulderEsistente?.settore || settoreIniziale || listaSettori[0])
  const [colorePrese, setColorePrese] = useState(boulderEsistente?.colorePrese || '')
  const [coloreGrado, setColoreGrado] = useState(boulderEsistente?.coloreGrado || '')
  const [old, setOld] = useState(boulderEsistente?.old || false)
  const [specialiAperto, setSpecialiAperto] = useState(() => isColoreSpeciale(boulderEsistente?.colorePrese))
  const [note, setNote] = useState(boulderEsistente?.note || '')
  // In modifica la data parte da quella già salvata sul blocco, non da oggi:
  // correggere il grado o il tracciatore è una correzione, non una nuova
  // tracciatura, e non deve far "ringiovanire" il blocco (né spostarlo in cima
  // all'ordinamento per data). La data cambia solo se la si tocca davvero.
  const [dataEvento, setDataEvento] = useState(
    mode === 'update' ? boulderEsistente?.dataUltimoCambio || oggiISO() : oggiISO()
  )
  const [tracciatoreId, setTracciatoreId] = useState(() => {
    if (mode !== 'update') return tracciatoreLoggato?.id || ''
    if (boulderEsistente?.tracciatoreNome === 'Altri') return TRACCIATORE_ALTRI
    return boulderEsistente?.tracciatoreId || ''
  })
  const [salvando, setSalvando] = useState(false)
  const [errore, setErrore] = useState(null)

  // Campo su cui il pannello è "ristretto". Parte dalla prop (la cella toccata
  // nella riga) ed è azzerabile dal link "Modifica tutto" in fondo, unica via
  // per arrivare a campi che nella riga non hanno una cella (es. le note).
  const [campoAttivo, setCampoAttivo] = useState(mode === 'update' ? campo || null : null)
  const mostra = (sezione) => !campoAttivo || campoAttivo === sezione

  // Toggle visibile SOLO quando il form viene aperto dalla sezione admin
  // "Vie fisse" (permanenteDefault passato): nei flussi normali di
  // creazione/modifica resta invisibile, nessun cambiamento per i
  // tracciatori. Non modificabile in aggiornamento: una volta creata, una
  // via fissa resta tale (nessuna UI per cambiarlo dopo).
  const [permanenteToggle, setPermanenteToggle] = useState(!!permanenteDefault)
  const mostraTogglePermanente = mode === 'create' && permanenteDefault !== undefined
  const permanente = mode === 'create' ? permanenteToggle : !!boulderEsistente?.permanente

  // Solo in creazione: uno o più colori prese selezionati contemporaneamente,
  // ciascuno con grado/tracciatore indipendenti, per generare N boulder in
  // un solo salvataggio. In modifica si resta a un solo boulder (vedi sopra).
  const [coloriPreseSelezionati, setColoriPreseSelezionati] = useState([])
  const [datiPerColore, setDatiPerColore] = useState({})

  // Il toggle OLD non si applica a giallo fluo/oro né agli speciali: se il
  // colore selezionato cambia verso uno di questi, disattivalo (evita di
  // salvare uno stato incoerente, coerente col resettarsi visivamente).
  useEffect(() => {
    if (!supportaOld(colorePrese)) setOld(false)
  }, [colorePrese])

  // Un boulder nasce sempre attivo; lo stato "non attivo" si ottiene solo
  // rimuovendolo (cestino in Dettaglio settore / Filtri), mai da qui.
  const stato = mode === 'create' ? 'attiva' : boulderEsistente?.stato || 'attiva'

  // Se il tracciatore salvato sul boulder non è più tra quelli attuali
  // (rimosso da AdminPanel), va comunque offerto come opzione selezionabile
  // nella select — altrimenti al salvataggio il .find() sotto non lo trova
  // più e tracciatoreNome verrebbe azzerato silenziosamente, perdendo
  // l'attribuzione storica. Il nome mostrato è quello già salvato sul
  // documento (unica fonte rimasta), marcato come non più attivo.
  const tracciatoreRimosso =
    mode === 'update' &&
    boulderEsistente?.tracciatoreId &&
    boulderEsistente.tracciatoreNome &&
    boulderEsistente.tracciatoreNome !== 'Altri' &&
    !tracciatori.some((t) => t.id === boulderEsistente.tracciatoreId)
      ? { id: boulderEsistente.tracciatoreId, nome: boulderEsistente.tracciatoreNome, rimosso: true }
      : null
  const tracciatoriPerSelezione = tracciatoreRimosso ? [...tracciatori, tracciatoreRimosso] : tracciatori

  // Il grado è sempre facoltativo: si può salvare/aggiornare un boulder
  // senza grado, o rimuovere un grado già impostato.
  const valido =
    mode === 'create'
      ? settore && coloriPreseSelezionati.length > 0 && dataEvento
      : settore && colorePrese && dataEvento && tracciatoreId

  const righeColori = [...LISTA_COLORI_PRESE, ...LISTA_COLORI_SPECIALI].filter((c) =>
    coloriPreseSelezionati.includes(c)
  )

  const testoBottone = salvando
    ? 'Salvataggio...'
    : mode === 'update'
    ? 'Salva'
    : coloriPreseSelezionati.length === 0
    ? 'Seleziona almeno un colore'
    : coloriPreseSelezionati.length === 1
    ? (tipo === 'corda' ? 'Crea via' : 'Crea boulder')
    : tipo === 'corda'
    ? `Crea ${coloriPreseSelezionati.length} vie`
    : `Crea ${coloriPreseSelezionati.length} boulder`

  function selezionaColoreSingolo(c) {
    setColorePrese(c)
    if (!supportaOld(c)) setOld(false)
  }

  function toggleColore(c) {
    setColoriPreseSelezionati((prev) => {
      if (prev.includes(c)) {
        setDatiPerColore((d) => {
          const next = { ...d }
          delete next[c]
          return next
        })
        return prev.filter((x) => x !== c)
      }
      setDatiPerColore((d) => ({
        ...d,
        [c]: { coloreGrado: '', tracciatoreId: tracciatoreLoggato?.id || '', old: false },
      }))
      return [...prev, c]
    })
  }

  function aggiornaRiga(colore, campo, valore) {
    setDatiPerColore((d) => ({ ...d, [colore]: { ...d[colore], [campo]: valore } }))
  }

  async function handleSalva() {
    if (!valido || salvando) return
    setSalvando(true)
    setErrore(null)

    try {
      const batch = writeBatch(db)

      // Pre-apertura stagione (1 settembre 2026): le vie permanenti
      // (toggle "Fissa") restano sempre sulla data reale, tutte le altre
      // creazioni/modifiche "nascono" il giorno di apertura finché non si
      // arriva davvero a quella data — vedi dataEffettiva() in lib/date.js.
      const effettiva = dataEffettiva()
      const creatoIlDaSalvare = permanente ? serverTimestamp() : effettiva.timestamp
      // L'aggancio alla data di apertura vale solo per le creazioni: in
      // modifica la data è quella già sul blocco (o quella scelta a mano), e
      // riscriverla con la data di apertura sarebbe una modifica non chiesta.
      const dataDaSalvare =
        mode === 'create' && !permanente && effettiva.preApertura ? effettiva.dataISO : dataEvento

      if (mode === 'create') {
        // Un boulder + un evento storico per ciascun colore selezionato:
        // ogni evento storico rappresenta una creazione reale, quindi la
        // classifica tracciatori conta esattamente N boulder creati.
        righeColori.forEach((colore) => {
          const riga = datiPerColore[colore] || {}
          const rigaSelezione = riga.tracciatoreId || tracciatoreLoggato?.id || ''
          const rigaTracciatoreId = rigaSelezione === TRACCIATORE_ALTRI ? null : rigaSelezione
          const rigaTracciatoreNome =
            rigaSelezione === TRACCIATORE_ALTRI
              ? 'Altri'
              : tracciatori.find((t) => t.id === rigaSelezione)?.nome || ''

          const snapshot = {
            settore,
            tipo,
            colorePrese: colore,
            coloreGrado: riga.coloreGrado || '',
            old: supportaOld(colore) ? !!riga.old : false,
            stato,
            note: note || null,
            tracciatoreId: rigaTracciatoreId,
            tracciatoreNome: rigaTracciatoreNome,
            dataUltimoCambio: dataDaSalvare,
            permanente,
          }

          const boulderRef = doc(collection(db, 'boulder'))
          batch.set(boulderRef, { ...snapshot, creatoIl: creatoIlDaSalvare })

          const storicoRef = doc(collection(db, 'storico'))
          batch.set(storicoRef, {
            boulderId: boulderRef.id,
            settore,
            tipo,
            tracciatoreId: rigaTracciatoreId,
            tracciatoreNome: rigaTracciatoreNome,
            eseguitoDaUid: auth.currentUser?.uid || null,
            eseguitoDaNome: tracciatoreLoggato?.nome || null,
            dataEvento: dataDaSalvare,
            colorePrese: colore,
            coloreGrado: riga.coloreGrado || '',
            stato,
            note: note || null,
            creatoIl: creatoIlDaSalvare,
          })
        })
      } else {
        // Una modifica non crea un nuovo evento storico (altrimenti ogni
        // correzione duplicherebbe il conteggio nella classifica): aggiorna
        // il documento boulder E allinea l'evento di creazione già in
        // `storico`, così le statistiche basate sullo storico (classifica
        // per grado, grado medio, settore preferito) riflettono subito le
        // correzioni fatte dopo la creazione — es. il grado aggiunto solo
        // in un secondo momento, o il tracciatore riassegnato.
        const tracciatoreIdDaSalvare = tracciatoreId === TRACCIATORE_ALTRI ? null : tracciatoreId
        const tracciatoreNome =
          tracciatoreId === TRACCIATORE_ALTRI
            ? 'Altri'
            : tracciatoriPerSelezione.find((t) => t.id === tracciatoreId)?.nome || ''

        // Se la data inserita è precedente all'ultimo cambio registrato
        // (correzione/inserimento retroattivo), non sovrascriviamo lo stato
        // "corrente" mostrato in Home, per non far "tornare indietro" la
        // card rispetto a un evento già più recente. La correzione dello
        // storico invece va applicata comunque.
        const eIlPiuRecente = dataDaSalvare >= (boulderEsistente.dataUltimoCambio || '')
        if (eIlPiuRecente) {
          const boulderRef = doc(db, 'boulder', boulderEsistente.id)
          batch.update(boulderRef, {
            settore,
            colorePrese,
            coloreGrado,
            old: supportaOld(colorePrese) ? old : false,
            stato,
            note: note || null,
            tracciatoreId: tracciatoreIdDaSalvare,
            tracciatoreNome,
            dataUltimoCambio: dataDaSalvare,
          })
        }

        // Allinea l'evento di creazione in storico (il più vecchio, nel
        // raro caso ce ne sia più d'uno per lo stesso blocco). Non tocca
        // `dataEvento`: il blocco resta nell'andamento nel periodo in cui è
        // stato tracciato, non in cui è stato corretto. Un blocco legacy
        // senza storico non ha nulla da allineare. `eseguitoDaUid` viene
        // riscritto con chi fa la correzione (richiesto dalle Rules).
        const snapStorico = await getDocs(
          query(collection(db, 'storico'), where('boulderId', '==', boulderEsistente.id))
        )
        if (!snapStorico.empty) {
          const docCreazione = snapStorico.docs.reduce((piuVecchio, d) => {
            if (!piuVecchio) return d
            const ms = (x) => (x?.toMillis ? x.toMillis() : 0)
            return ms(d.data().creatoIl) < ms(piuVecchio.data().creatoIl) ? d : piuVecchio
          }, null)
          batch.update(docCreazione.ref, {
            settore,
            colorePrese,
            coloreGrado: coloreGrado || '',
            stato,
            note: note || null,
            tracciatoreId: tracciatoreIdDaSalvare,
            tracciatoreNome,
            eseguitoDaUid: auth.currentUser?.uid || null,
            eseguitoDaNome: tracciatoreLoggato?.nome || null,
          })
        }
      }

      await batch.commit()
      onSalvato()
    } catch {
      setErrore('Connessione assente, riprova. Se il problema persiste il salvataggio non è andato a buon fine.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-navy">
              {mode === 'create'
                ? tipo === 'corda' ? 'Nuova via' : 'Nuovo boulder'
                : campoAttivo
                ? TITOLO_CAMPO[campoAttivo]
                : tipo === 'corda' ? 'Aggiorna via' : 'Aggiorna boulder'}
            </h2>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
          </div>

          {/* In un pannello mono-campo il settore non è né modificabile né
              utile: al suo posto una riga di contesto che dice QUALE blocco si
              sta modificando, altrimenti un pannello con le sole stelline del
              grado non dice a chi appartengono. */}
          {campoAttivo && (
            <p className="text-xs text-gray-400 mb-4">
              {primaLettera(nomeColorePrese(colorePrese))} · {settore}
            </p>
          )}

          {/* Settore — solo in creazione, non modificabile in aggiornamento */}
          <div className={`mb-4 ${mostra('settore') ? '' : 'hidden'}`}>
            <p className="text-xs text-gray-400 mb-2">Settore</p>
            {mode === 'create' ? (
              <div className="grid grid-cols-2 gap-2">
                {listaSettori.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSettore(s)}
                    className={`px-3 py-2 rounded-lg text-sm border text-left ${
                      settore === s ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-700">{settore}</p>
            )}
          </div>

          {/* Colore prese — multi-selezione in creazione, singola in modifica */}
          <div className={`mb-4 ${mostra('colorePrese') ? '' : 'hidden'}`}>
            <p className={LABEL_PRESE}>Colore prese</p>
            <div className="grid grid-cols-3 gap-2">
              {LISTA_COLORI_PRESE.map((c) => {
                const attivo = mode === 'create' ? coloriPreseSelezionati.includes(c) : colorePrese === c
                return (
                  <button
                    key={c}
                    onClick={() => (mode === 'create' ? toggleColore(c) : selezionaColoreSingolo(c))}
                    className="px-2 py-2 rounded-lg text-xs font-medium border capitalize"
                    style={{
                      backgroundColor: attivo ? COLORI_PRESE[c] : 'white',
                      color: attivo ? 'white' : COLORI_PRESE[c],
                      borderColor: COLORI_PRESE[c],
                    }}
                  >
                    {c}
                  </button>
                )
              })}
            </div>

            {/* Speciali: set chiuso di 5 valori (3 bicolore + 2 pieni), meno
                frequenti dei 12 base — accordion chiuso di default, aperto
                automaticamente solo se il colore già selezionato è uno di questi. */}
            <button
              type="button"
              onClick={() => setSpecialiAperto((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-400 font-medium mt-3 mb-2"
            >
              <span className={`inline-block transition-transform ${specialiAperto ? 'rotate-90' : ''}`}>▸</span>
              Speciali
            </button>
            {specialiAperto && (
              <div className="grid grid-cols-3 gap-2">
                {LISTA_COLORI_SPECIALI.map((c) => {
                  const attivo = mode === 'create' ? coloriPreseSelezionati.includes(c) : colorePrese === c
                  const speciale = COLORI_SPECIALI[c]
                  const coloreRappresentativo = hexRappresentativo(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => (mode === 'create' ? toggleColore(c) : selezionaColoreSingolo(c))}
                      className="px-2 py-2 rounded-lg text-xs font-medium border-2"
                      style={{
                        background: attivo ? sfondoColorePrese(c) : 'white',
                        color: attivo ? testoPerColorePrese(c) : coloreRappresentativo,
                        borderColor: '#111',
                        filter: speciale.desaturato ? 'saturate(0.62) brightness(1.04)' : undefined,
                        opacity: speciale.desaturato ? 0.88 : 1,
                      }}
                    >
                      {speciale.nome}
                    </button>
                  )
                })}
              </div>
            )}

            {mode === 'update' && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  disabled={!supportaOld(colorePrese)}
                  onClick={() => setOld((v) => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                    old ? 'bg-navy' : 'bg-gray-300'
                  } ${!supportaOld(colorePrese) ? 'opacity-40' : ''}`}
                  aria-label="OLD"
                  aria-pressed={old}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      old ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-gray-600">OLD</span>
              </div>
            )}

            {mode === 'update' && colorePrese && (
              <p className="text-xs text-gray-500 mt-2">
                Selezionato: {primaLettera(nomeColorePrese(colorePrese))}
                {old ? ' (old)' : ''}
              </p>
            )}
          </div>

          {mode === 'create' ? (
            /* Tabella dinamica: una riga per colore selezionato, con grado e
               tracciatore indipendenti per riga. Sostituisce i campi singoli
               usati in modifica. */
            <div className="mb-4">
              <p className={LABEL_GRADO}>
                Grado <span className="font-normal normal-case text-navy/60">e tracciatore</span>
              </p>
              {righeColori.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
                  Seleziona uno o più colori qui sopra per iniziare.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="text-gray-400 text-left">
                        <th className="px-2 py-1.5 font-normal">Colore</th>
                        <th className="px-2 py-1.5 font-normal">Grado</th>
                        <th className="px-2 py-1.5 font-normal">Tracciatore</th>
                        <th className="px-2 py-1.5 font-normal">Old</th>
                      </tr>
                    </thead>
                    <tbody>
                      {righeColori.map((colore) => {
                        const riga = datiPerColore[colore] || {}
                        const sfondo = hexRappresentativo(colore)
                        return (
                          <tr key={colore} style={{ backgroundColor: `${sfondo}22` }}>
                            <td className="px-2 py-2 align-top">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ background: sfondoColorePrese(colore, sfondo) }}
                                />
                                <span className="capitalize truncate">{nomeColorePrese(colore)}</span>
                              </span>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <div className="grid grid-cols-4 gap-1">
                                {LISTA_COLORI_GRADO.map((g) => (
                                  <button
                                    key={g}
                                    type="button"
                                    onClick={() =>
                                      aggiornaRiga(colore, 'coloreGrado', riga.coloreGrado === g ? '' : g)
                                    }
                                    className={`rounded-full ${
                                      riga.coloreGrado === g ? 'ring-2 ring-navy' : ''
                                    }`}
                                    title={g}
                                  >
                                    <GradoStar coloreGrado={g} size="tabella" />
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <select
                                value={riga.tracciatoreId || ''}
                                onChange={(e) => aggiornaRiga(colore, 'tracciatoreId', e.target.value)}
                                className="w-full px-1.5 py-1 rounded-md border border-gray-200 text-xs bg-white"
                              >
                                {tracciatori.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.nome}
                                  </option>
                                ))}
                                <option value={TRACCIATORE_ALTRI}>Altri</option>
                              </select>
                            </td>
                            <td className="px-2 py-2 align-top">
                              <button
                                type="button"
                                disabled={!supportaOld(colore)}
                                onClick={() => aggiornaRiga(colore, 'old', !riga.old)}
                                className={`relative w-8 h-5 rounded-full transition-colors ${
                                  riga.old ? 'bg-navy' : 'bg-gray-300'
                                } ${!supportaOld(colore) ? 'opacity-40' : ''}`}
                                aria-label={`Old per ${colore}`}
                                aria-pressed={!!riga.old}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                    riga.old ? 'translate-x-3' : ''
                                  }`}
                                />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Colore grado */}
              <div className={`mb-4 ${mostra('coloreGrado') ? '' : 'hidden'}`}>
                <p className={LABEL_GRADO}>
                  Grado <span className="font-normal normal-case text-navy/60">· facile → difficile</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {LISTA_COLORI_GRADO.map((g) => {
                    const attivo = coloreGrado === g
                    return (
                      <button
                        key={g}
                        onClick={() => setColoreGrado(coloreGrado === g ? '' : g)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border capitalize ${
                          attivo ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-700'
                        }`}
                      >
                        <GradoStar coloreGrado={g} size="sm" />
                        {g}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tracciatore attribuito */}
              <div className={`mb-4 ${mostra('tracciatore') ? '' : 'hidden'}`}>
                <p className="text-xs text-gray-400 mb-2">Tracciatore</p>
                <div className="flex flex-wrap gap-2">
                  {tracciatoriPerSelezione.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTracciatoreId(t.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        tracciatoreId === t.id
                          ? 'bg-navy text-white border-navy'
                          : t.rimosso
                          ? 'border-dashed border-gray-300 text-gray-400 italic'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {t.nome}
                      {t.rimosso ? ' (rimosso)' : ''}
                    </button>
                  ))}
                  <button
                    onClick={() => setTracciatoreId(TRACCIATORE_ALTRI)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${
                      tracciatoreId === TRACCIATORE_ALTRI ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Altri
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Data */}
          <div className={`mb-4 ${mostra('data') ? '' : 'hidden'}`}>
            <p className="text-xs text-gray-400 mb-2">Data</p>
            <input
              type="date"
              value={dataEvento}
              onChange={(e) => setDataEvento(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>

          {/* Note */}
          <div className={`mb-4 ${mostra('note') ? '' : 'hidden'}`}>
            <p className="text-xs text-gray-400 mb-2">Note (facoltative)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              placeholder={
                tipo === 'corda'
                  ? 'es. dx, sx — solo se serve distinguere vie simili'
                  : 'es. dx, sx — solo se serve distinguere boulder simili'
              }
            />
          </div>

          {mostraTogglePermanente && (
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPermanenteToggle((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  permanenteToggle ? 'bg-navy' : 'bg-gray-300'
                }`}
                aria-label="Via permanente"
                aria-pressed={permanenteToggle}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    permanenteToggle ? 'translate-x-4' : ''
                  }`}
                />
              </button>
              <span className="text-xs font-medium text-gray-600">Via fissa (permanente, non ruota)</span>
            </div>
          )}

          {errore && <p className="text-rosso text-sm">{errore}</p>}
        </div>

        <div className="p-5 pt-3 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSalva}
            disabled={!valido || salvando}
            className="w-full py-3 rounded-xl bg-navy text-white font-medium disabled:opacity-40"
          >
            {testoBottone}
          </button>
          {campoAttivo && (
            <button
              type="button"
              onClick={() => setCampoAttivo(null)}
              className="block mx-auto mt-3 text-xs text-gray-400 underline"
            >
              Modifica tutto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
