import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import BoulderForm from './BoulderForm'

// Sotto-pagina di Profilo, raggiungibile solo da admin (vedi guard sotto),
// usata una volta l'anno a inizio stagione per creare boulder/vie
// "permanenti" (didattiche/simil-Speed, poche unità) che non rientrano mai
// nella rotazione normale. Riusa BoulderForm in modalità 'create' passando
// permanenteDefault, senza duplicare la logica di creazione/validazione.
export default function VieFisse({ tracciatoreLoggato }) {
  const navigate = useNavigate()
  const [tracciatori, setTracciatori] = useState([])
  const [tipoAttivo, setTipoAttivo] = useState('boulder')
  const [formAperto, setFormAperto] = useState(false)

  const isAdmin = !!tracciatoreLoggato?.isAdmin

  useEffect(() => {
    if (!isAdmin) return
    async function caricaTracciatori() {
      try {
        const snap = await getDocs(collection(db, 'tracciatori'))
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        lista.sort((a, b) => a.nome.localeCompare(b.nome))
        setTracciatori(lista)
      } catch {
        // non blocca la pagina se fallisce solo questo
      }
    }
    caricaTracciatori()
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <header className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/')} className="text-navy text-xl leading-none shrink-0" aria-label="Torna al Profilo">
            ←
          </button>
          <h1 className="text-lg font-bold text-navy">Vie fisse</h1>
        </header>
        <p className="text-center text-gray-400 text-sm py-10">Sezione riservata agli admin.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/')} className="text-navy text-xl leading-none shrink-0" aria-label="Torna al Profilo">
          ←
        </button>
        <h1 className="text-lg font-bold text-navy">Vie fisse</h1>
      </header>

      <p className="text-xs text-gray-400 mb-4">
        Crea boulder o vie didattiche che restano montate tutto l'anno senza ruotare (badge "fissa" nelle liste). Da
        usare una volta l'anno a inizio stagione.
      </p>

      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Tipo</p>
        <div className="flex gap-2">
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
      </div>

      <button onClick={() => setFormAperto(true)} className="w-full py-3 rounded-xl bg-navy text-white font-medium">
        + Nuova via fissa
      </button>

      {formAperto && (
        <BoulderForm
          mode="create"
          tipo={tipoAttivo}
          tracciatoreLoggato={tracciatoreLoggato}
          tracciatori={tracciatori}
          permanenteDefault={true}
          onClose={() => setFormAperto(false)}
          onSalvato={() => setFormAperto(false)}
        />
      )}
    </div>
  )
}
