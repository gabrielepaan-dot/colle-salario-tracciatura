import { useNavigate } from 'react-router-dom'
import { LISTA_SETTORI } from '../lib/colori'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <header className="flex items-center gap-3 mb-4">
        <img src="/colle-salario-tracciatura/logo.svg" alt="" className="w-9 h-9" />
        <h1 className="text-lg font-bold text-navy">Settori</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {LISTA_SETTORI.map((settore) => (
          <button
            key={settore}
            onClick={() => navigate(`/settore/${encodeURIComponent(settore)}`)}
            className="rounded-2xl bg-white border border-gray-200 shadow-sm px-4 py-5 text-left text-sm font-semibold text-navy hover:bg-gray-50"
          >
            {settore}
          </button>
        ))}
      </div>
    </div>
  )
}
