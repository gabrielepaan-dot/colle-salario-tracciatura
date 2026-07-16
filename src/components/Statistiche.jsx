import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { ORDINE_GRADI, COLORI_GRADO, LISTA_SETTORI, LISTA_SETTORI_CORDA } from '../lib/colori'
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

export default function Statistiche({ tracciatoreLoggato }) {
  const [datiGrado, setDatiGrado] = useState([])
  const [datiSettore, setDatiSettore] = useState([])
  const [classifica, setClassifica] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [periodo, setPeriodo] = useState('mese')
  const [tipoAttivo, setTipoAttivo] = useState('boulder')

  const etichettaGrado = tipoAttivo === 'corda' ? 'Vie attive per grado' : 'Boulder attivi per grado'
  const etichettaSettore = tipoAttivo === 'corda' ? 'Vie attive per settore' : 'Boulder attivi per settore'

  const carica = useCallback(async () => {
    setCaricamento(true)
    setErrore(null)

    try {
      // Conteggi boulder attivi per grado e settore (stato corrente, non dipende dal periodo)
      const qAttivi = query(
        collection(db, 'boulder'),
        where('tipo', '==', tipoAttivo),
        where('stato', '==', 'attiva')
      )

      // Storico eventi nel periodo, per la classifica tracciatori.
      // Nota: tracciatoreNome è già denormalizzato su ogni voce di storico,
      // quindi qui non serve nessun "join" — a differenza della versione
      // Supabase, dove serviva disambiguare le due FK verso "tracciatori".
      const inizio = inizioPeriodo(periodo)
      const qStorico = inizio
        ? query(collection(db, 'storico'), where('tipo', '==', tipoAttivo), where('dataEvento', '>=', inizio))
        : query(collection(db, 'storico'), where('tipo', '==', tipoAttivo))

      // Blocchi nel sotto-cestino (eliminati definitivamente dal Cestino, in
      // attesa di hard delete o ripristino admin, vedi SottoCestino.jsx): le
      // loro voci storico restano in Firestore per permettere il ripristino,
      // ma vanno escluse qui dalla classifica finché un admin non li
      // ripristina — coerente con quanto promesso nel dialog di conferma di
      // "Elimina definitivamente" in Cestino.jsx.
      const qSottocestino = query(collection(db, 'boulder'), where('inSottocestino', '==', true))

      const [snapAttivi, snapStorico, snapSottocestino] = await Promise.all([
        getDocs(qAttivi),
        getDocs(qStorico),
        getDocs(qSottocestino),
      ])
      const attivi = snapAttivi.docs.map((d) => d.data())
      const idSottocestino = new Set(snapSottocestino.docs.map((d) => d.id))
      const eventi = snapStorico.docs.map((d) => d.data()).filter((e) => !idSottocestino.has(e.boulderId))

      // Aggregazione per grado (ordinata facile → difficile)
      const conteggioGrado = {}
      ORDINE_GRADI.forEach((g) => (conteggioGrado[g] = 0))
      attivi.forEach((b) => {
        if (conteggioGrado[b.coloreGrado] !== undefined) conteggioGrado[b.coloreGrado]++
      })
      setDatiGrado(ORDINE_GRADI.map((g) => ({ grado: g, conteggio: conteggioGrado[g] })))

      // Aggregazione per settore (lista dipende dal tipo attivo)
      const listaSettori = tipoAttivo === 'corda' ? LISTA_SETTORI_CORDA : LISTA_SETTORI
      const conteggioSettore = {}
      listaSettori.forEach((s) => (conteggioSettore[s] = 0))
      attivi.forEach((b) => {
        if (conteggioSettore[b.settore] !== undefined) conteggioSettore[b.settore]++
      })
      setDatiSettore(
        listaSettori.map((s) => ({ nome: s, valore: conteggioSettore[s] })).filter((s) => s.valore > 0)
      )

      // Classifica tracciatori, con suddivisione per grado
      const perTracciatore = {}
      eventi.forEach((e) => {
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
      const listaClassifica = Object.values(perTracciatore).sort((a, b) => b.totale - a.totale)
      setClassifica(listaClassifica)
    } catch (e) {
      setErrore('Connessione assente, riprova.')
      console.error(e)
    }

    setCaricamento(false)
  }, [periodo, tipoAttivo])

  useEffect(() => {
    carica()
  }, [carica])

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-lg font-bold text-navy mb-4">Statistiche</h1>

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
          <button onClick={carica} className="px-4 py-2 rounded-lg bg-navy text-white text-sm">Riprova</button>
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

          {tracciatoreLoggato?.isAdmin && <ExportCsv />}
        </div>
      )}
    </div>
  )
}
