import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { ORDINE_GRADI, COLORI_GRADO, LISTA_SETTORI, LISTA_SETTORI_CORDA } from '../lib/colori'
import { giorniTra, formattaDataCompatta } from '../lib/date'
import ExportCsv from './ExportCsv'

const PALETTE_SETTORI = [
  '#0c1445', '#FFC72C', '#1E9E5A', '#E8202A', '#0EA5E9',
  '#7C3AED', '#F97316', '#EC4899', '#14532D', '#9CA3AF',
]

const PERIODI = [
  { id: 'settimana', label: 'Settimana' },
  { id: 'mese', label: 'Mese' },
  { id: 'anno', label: 'Anno' },
  { id: 'sempre', label: 'Sempre' },
]

// Finestra fissa per il grafico "Andamento nel tempo": ultimi 6 mesi,
// indipendente dal selettore "periodo" qui sopra (quello resta solo per la
// classifica tracciatori, come da spec).
const FINESTRA_ANDAMENTO_MESI = 6

function inizioPeriodo(periodo) {
  const ora = new Date()
  if (periodo === 'settimana') {
    const d = new Date(ora)
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  }
  if (periodo === 'mese') {
    const d = new Date(ora)
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  }
  if (periodo === 'anno') {
    const d = new Date(ora)
    d.setFullYear(d.getFullYear() - 1)
    return d.toISOString().slice(0, 10)
  }
  return null // 'sempre'
}

// Lunedì della settimana che contiene dataStr ('YYYY-MM-DD'), come 'YYYY-MM-DD'.
function inizioSettimana(dataStr) {
  const d = new Date(`${dataStr}T00:00:00`)
  const giorniDaLunedi = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - giorniDaLunedi)
  return d.toISOString().slice(0, 10)
}

function indiceGrado(colore) {
  const i = ORDINE_GRADI.indexOf(colore)
  return i === -1 ? null : i
}

// Costruisce i bucket (settimana o mese) degli ultimi FINESTRA_ANDAMENTO_MESI
// mesi, riempiendo anche i bucket senza eventi (0), così il grafico mostra
// un andamento continuo invece di saltare i periodi vuoti.
function costruisciAndamento(eventi, unita) {
  if (unita === 'mese') {
    const chiavi = []
    for (let i = FINESTRA_ANDAMENTO_MESI - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      chiavi.push(d.toISOString().slice(0, 7))
    }
    const conteggio = {}
    chiavi.forEach((k) => (conteggio[k] = 0))
    eventi.forEach((e) => {
      const k = e.dataEvento?.slice(0, 7)
      if (conteggio[k] !== undefined) conteggio[k]++
    })
    return chiavi.map((k) => ({
      etichetta: new Date(`${k}-01T00:00:00`).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
      conteggio: conteggio[k],
    }))
  }

  const oggi = new Date()
  const inizioFinestra = new Date()
  inizioFinestra.setMonth(inizioFinestra.getMonth() - FINESTRA_ANDAMENTO_MESI)

  const chiavi = []
  let cursore = inizioSettimana(inizioFinestra.toISOString().slice(0, 10))
  const fine = inizioSettimana(oggi.toISOString().slice(0, 10))
  while (cursore <= fine) {
    chiavi.push(cursore)
    const d = new Date(`${cursore}T00:00:00`)
    d.setDate(d.getDate() + 7)
    cursore = d.toISOString().slice(0, 10)
  }
  const conteggio = {}
  chiavi.forEach((k) => (conteggio[k] = 0))
  eventi.forEach((e) => {
    if (!e.dataEvento) return
    const k = inizioSettimana(e.dataEvento)
    if (conteggio[k] !== undefined) conteggio[k]++
  })
  return chiavi.map((k) => ({ etichetta: formattaDataCompatta(k), conteggio: conteggio[k] }))
}

// Barra a scala colori con un marcatore alla posizione media (0-7, può
// essere frazionaria) per il grado medio di un tracciatore.
function BarraGradoMedio({ indice }) {
  const max = ORDINE_GRADI.length - 1
  const percentuale = (indice / max) * 100
  return (
    <div className="relative h-2.5 rounded-full overflow-hidden flex" style={{ minWidth: '5rem' }}>
      {ORDINE_GRADI.map((g) => (
        <div key={g} className="flex-1 h-full" style={{ backgroundColor: COLORI_GRADO[g] }} />
      ))}
      <div
        className="absolute top-1/2 w-1.5 h-1.5 rounded-full bg-white border border-navy -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${percentuale}%` }}
      />
    </div>
  )
}

export default function Statistiche({ tracciatoreLoggato }) {
  const [attiviTutti, setAttiviTutti] = useState([])
  const [idSottocestino, setIdSottocestino] = useState(new Set())
  const [eventiCompletiRaw, setEventiCompletiRaw] = useState([])
  const [rimossiTutti, setRimossiTutti] = useState([])

  const [caricamentoBase, setCaricamentoBase] = useState(true)
  const [caricamentoTipo, setCaricamentoTipo] = useState(true)
  const [errore, setErrore] = useState(null)
  const [periodo, setPeriodo] = useState('mese')
  const [tipoAttivo, setTipoAttivo] = useState('boulder')
  const [unitaAndamento, setUnitaAndamento] = useState('settimana')

  const caricamento = caricamentoBase || caricamentoTipo

  const etichettaGrado = tipoAttivo === 'corda' ? 'Vie attive per grado' : 'Boulder attivi per grado'
  const etichettaSettore = tipoAttivo === 'corda' ? 'Vie attive per settore' : 'Boulder attivi per settore'
  const etichettaAndamento = tipoAttivo === 'corda' ? 'Vie tracciate nel tempo' : 'Boulder tracciati nel tempo'

  // Dati indipendenti dal toggle Boulder/Corda: caricati una sola volta.
  // qAttiviTutti riunisce entrambi i tipi in un'unica fetch (serve sia per
  // i due totali sempre visibili, sia — filtrato in JS — per i grafici per
  // grado/settore del tipo selezionato) invece di due query separate.
  // qRimossiTutti riunisce entrambi i tipi per la card "durata media prima
  // della rimozione", che mostra boulder e vie insieme indipendentemente
  // dal toggle.
  const caricaBase = useCallback(async () => {
    setCaricamentoBase(true)
    setErrore(null)
    try {
      const qAttiviTutti = query(collection(db, 'boulder'), where('stato', '==', 'attiva'))
      const qSottocestino = query(collection(db, 'boulder'), where('inSottocestino', '==', true))
      const qRimossiTutti = query(collection(db, 'boulder'), where('stato', '==', 'rimossa'))
      const [snapAttivi, snapSottocestino, snapRimossi] = await Promise.all([
        getDocs(qAttiviTutti),
        getDocs(qSottocestino),
        getDocs(qRimossiTutti),
      ])
      setAttiviTutti(snapAttivi.docs.map((d) => d.data()))
      setIdSottocestino(new Set(snapSottocestino.docs.map((d) => d.id)))
      setRimossiTutti(snapRimossi.docs.map((d) => d.data()))
    } catch (e) {
      setErrore('Connessione assente, riprova.')
      console.error(e)
    }
    setCaricamentoBase(false)
  }, [])

  // Dati che dipendono dal tipo selezionato: storico COMPLETO (non limitato
  // al periodo, a differenza della vecchia query), per poter calcolare
  // grado medio/settore preferito su tutto lo storico disponibile senza
  // rifetchare a ogni cambio di "periodo".
  const caricaPerTipo = useCallback(async () => {
    setCaricamentoTipo(true)
    setErrore(null)
    try {
      const qStoricoCompleto = query(collection(db, 'storico'), where('tipo', '==', tipoAttivo))
      const snapStorico = await getDocs(qStoricoCompleto)
      setEventiCompletiRaw(snapStorico.docs.map((d) => d.data()))
    } catch (e) {
      setErrore('Connessione assente, riprova.')
      console.error(e)
    }
    setCaricamentoTipo(false)
  }, [tipoAttivo])

  useEffect(() => {
    caricaBase()
  }, [caricaBase])

  useEffect(() => {
    caricaPerTipo()
  }, [caricaPerTipo])

  const ricarica = useCallback(() => {
    caricaBase()
    caricaPerTipo()
  }, [caricaBase, caricaPerTipo])

  // Esclude dallo storico gli eventi di boulder finiti nel sotto-cestino
  // admin, in attesa di ripristino o hard-delete (stessa logica di prima).
  const eventiCompleti = useMemo(
    () => eventiCompletiRaw.filter((e) => !idSottocestino.has(e.boulderId)),
    [eventiCompletiRaw, idSottocestino]
  )

  const totaleBoulderAttivi = useMemo(() => attiviTutti.filter((b) => b.tipo === 'boulder').length, [attiviTutti])
  const totaleVieAttive = useMemo(() => attiviTutti.filter((b) => b.tipo === 'corda').length, [attiviTutti])

  const attivi = useMemo(() => attiviTutti.filter((b) => b.tipo === tipoAttivo), [attiviTutti, tipoAttivo])

  const datiGrado = useMemo(() => {
    const conteggio = {}
    ORDINE_GRADI.forEach((g) => (conteggio[g] = 0))
    attivi.forEach((b) => {
      if (conteggio[b.coloreGrado] !== undefined) conteggio[b.coloreGrado]++
    })
    return ORDINE_GRADI.map((g) => ({ grado: g, conteggio: conteggio[g] }))
  }, [attivi])

  const datiSettore = useMemo(() => {
    const listaSettori = tipoAttivo === 'corda' ? LISTA_SETTORI_CORDA : LISTA_SETTORI
    const conteggio = {}
    listaSettori.forEach((s) => (conteggio[s] = 0))
    attivi.forEach((b) => {
      if (conteggio[b.settore] !== undefined) conteggio[b.settore]++
    })
    return listaSettori.map((s) => ({ nome: s, valore: conteggio[s] })).filter((s) => s.valore > 0)
  }, [attivi, tipoAttivo])

  // Classifica tracciatori: filtro periodo applicato in JS sullo storico
  // completo già caricato, nessuna nuova query a ogni cambio di periodo.
  const classifica = useMemo(() => {
    const inizio = inizioPeriodo(periodo)
    const eventiPeriodo = inizio ? eventiCompleti.filter((e) => e.dataEvento >= inizio) : eventiCompleti

    const perTracciatore = {}
    eventiPeriodo.forEach((e) => {
      const nome = e.tracciatoreNome || 'Sconosciuto'
      if (!perTracciatore[nome]) {
        perTracciatore[nome] = { nome, totale: 0 }
        ORDINE_GRADI.forEach((g) => (perTracciatore[nome][g] = 0))
      }
      perTracciatore[nome].totale++
      if (e.coloreGrado && perTracciatore[nome][e.coloreGrado] !== undefined) {
        perTracciatore[nome][e.coloreGrado]++
      }
    })
    return Object.values(perTracciatore).sort((a, b) => b.totale - a.totale)
  }, [eventiCompleti, periodo])

  const andamento = useMemo(() => costruisciAndamento(eventiCompleti, unitaAndamento), [eventiCompleti, unitaAndamento])

  // Grado medio e settore preferito per tracciatore, su TUTTO lo storico
  // disponibile (non limitato al periodo della classifica sopra).
  const statsTracciatori = useMemo(() => {
    const perTracciatore = {}
    eventiCompleti.forEach((e) => {
      const nome = e.tracciatoreNome || 'Sconosciuto'
      if (!perTracciatore[nome]) {
        perTracciatore[nome] = { nome, sommaIndici: 0, conteggioGrado: 0, settori: {} }
      }
      const stato = perTracciatore[nome]
      const idx = indiceGrado(e.coloreGrado)
      if (idx !== null) {
        stato.sommaIndici += idx
        stato.conteggioGrado++
      }
      if (e.settore) {
        stato.settori[e.settore] = (stato.settori[e.settore] || 0) + 1
      }
    })

    return Object.values(perTracciatore)
      .filter((t) => t.conteggioGrado > 0 || Object.keys(t.settori).length > 0)
      .map((t) => {
        let settorePreferito = null
        let massimo = 0
        Object.entries(t.settori).forEach(([settore, conteggio]) => {
          if (conteggio > massimo) {
            massimo = conteggio
            settorePreferito = settore
          }
        })
        return {
          nome: t.nome,
          gradoMedio: t.conteggioGrado > 0 ? t.sommaIndici / t.conteggioGrado : null,
          settorePreferito,
        }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [eventiCompleti])

  // Durata media (giorni) di un blocco prima della rimozione: su tutti i
  // boulder rimossi (stato: 'rimossa'), inclusi quelli già in sotto-cestino
  // (entrambi hanno creatoIl/rimossoIl). Calcolata per tipo (boulder/corda)
  // indipendentemente dal toggle Boulder/Corda della pagina, così la card
  // mostra sempre entrambi i valori.
  const mediaGiorniPerTipo = useCallback(
    (tipo) => {
      const giorni = rimossiTutti
        .filter((b) => b.tipo === tipo)
        .map((b) => giorniTra(b.creatoIl, b.rimossoIl))
        .filter((g) => g !== null && g >= 0)
      if (giorni.length === 0) return null
      return giorni.reduce((s, g) => s + g, 0) / giorni.length
    },
    [rimossiTutti]
  )

  const durataMediaBoulder = useMemo(() => mediaGiorniPerTipo('boulder'), [mediaGiorniPerTipo])
  const durataMediaCorda = useMemo(() => mediaGiorniPerTipo('corda'), [mediaGiorniPerTipo])

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-lg font-bold text-navy mb-4">Statistiche</h1>

      {/* Totali complessivi: sempre visibili, indipendenti dal toggle Boulder/Corda */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-navy">{caricamentoBase ? '—' : totaleBoulderAttivi}</p>
          <p className="text-xs text-gray-400 mt-1">Boulder attivi</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-navy">{caricamentoBase ? '—' : totaleVieAttive}</p>
          <p className="text-xs text-gray-400 mt-1">Vie attive</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTipoAttivo('boulder')}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            tipoAttivo === 'boulder' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
          }`}
        >
          Boulder
        </button>
        <button
          onClick={() => setTipoAttivo('corda')}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            tipoAttivo === 'corda' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
          }`}
        >
          Corda
        </button>
      </div>

      {caricamento && <p className="text-center text-gray-400 text-sm py-10">Caricamento...</p>}

      {errore && (
        <div className="text-center py-10">
          <p className="text-rosso text-sm mb-3">{errore}</p>
          <button onClick={ricarica} className="px-4 py-2 rounded-lg bg-navy text-white text-sm">Riprova</button>
        </div>
      )}

      {!caricamento && !errore && (
        <div className="flex flex-col gap-6">
          {/* Boulder attivi per grado */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <h2 className="font-bold text-navy text-sm mb-3">{etichettaGrado}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datiGrado}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="grado" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="conteggio" radius={[4, 4, 0, 0]}>
                  {datiGrado.map((entry) => (
                    <Cell key={entry.grado} fill={COLORI_GRADO[entry.grado]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Boulder attivi per settore */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <h2 className="font-bold text-navy text-sm mb-3">{etichettaSettore}</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={datiSettore} dataKey="valore" nameKey="nome" outerRadius={90} label={{ fontSize: 10 }}>
                  {datiSettore.map((entry, i) => (
                    <Cell key={entry.nome} fill={PALETTE_SETTORI[i % PALETTE_SETTORI.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </section>

          {/* Andamento nel tempo */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-navy text-sm">{etichettaAndamento}</h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setUnitaAndamento('settimana')}
                  className={`px-2.5 py-1 rounded-full text-[11px] border ${
                    unitaAndamento === 'settimana' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Settimana
                </button>
                <button
                  onClick={() => setUnitaAndamento('mese')}
                  className={`px-2.5 py-1 rounded-full text-[11px] border ${
                    unitaAndamento === 'mese' ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Mese
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mb-2">Ultimi 6 mesi</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={andamento}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="etichetta" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="conteggio" stroke="#0c1445" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Durata media di un blocco prima della rimozione, per tipo */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <h2 className="font-bold text-navy text-sm mb-3">Durata media prima della rimozione</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-navy">
                  {durataMediaBoulder === null ? '—' : Math.round(durataMediaBoulder * 10) / 10}
                </p>
                <p className="text-xs text-gray-400 mt-1">Boulder (giorni)</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-navy">
                  {durataMediaCorda === null ? '—' : Math.round(durataMediaCorda * 10) / 10}
                </p>
                <p className="text-xs text-gray-400 mt-1">Vie (giorni)</p>
              </div>
            </div>
          </section>

          {/* Classifica tracciatori */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-navy text-sm">Classifica tracciatori</h2>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {PERIODI.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    periodo === p.id ? 'bg-navy text-white border-navy' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {classifica.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Nessun evento in questo periodo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, classifica.length * 40)}>
                <BarChart data={classifica} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  {ORDINE_GRADI.map((g) => (
                    <Bar key={g} dataKey={g} stackId="a" fill={COLORI_GRADO[g]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Grado medio e settore preferito per tracciatore (tutto lo storico) */}
          <section className="bg-white border border-gray-200 rounded-2xl p-4">
            <h2 className="font-bold text-navy text-sm mb-1">Grado medio e settore preferito</h2>
            <p className="text-[11px] text-gray-400 mb-3">Su tutto lo storico disponibile</p>
            {statsTracciatori.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">Nessun dato disponibile.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {statsTracciatori.map((t) => (
                  <div key={t.nome} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-navy truncate">{t.nome}</span>
                      <span className="text-gray-400 truncate ml-2">{t.settorePreferito || '—'}</span>
                    </div>
                    {t.gradoMedio !== null ? (
                      <div className="flex items-center gap-2">
                        <BarraGradoMedio indice={t.gradoMedio} />
                        <span className="text-[11px] text-gray-500 shrink-0">
                          {ORDINE_GRADI[Math.round(t.gradoMedio)]} ({(t.gradoMedio + 1).toFixed(1)}/8)
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400">Nessun grado registrato</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {tracciatoreLoggato?.isAdmin && <ExportCsv />}
        </div>
      )}
    </div>
  )
}
