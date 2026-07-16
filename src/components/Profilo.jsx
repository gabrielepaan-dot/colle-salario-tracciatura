import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import AdminPanel from './AdminPanel'

export default function Profilo({ tracciatoreLoggato, onApriLogin, onLogout }) {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <h1 className="text-lg font-bold text-navy mb-4">Profilo</h1>

      {!tracciatoreLoggato ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-gray-500 text-sm mb-3">Non sei loggato. La vista boulder resta comunque visibile a tutti.</p>
          <button onClick={onApriLogin} className="px-4 py-2 rounded-lg bg-navy text-white text-sm">
            Accedi per tracciare
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
            <Avatar nome={tracciatoreLoggato.nome} size="lg" />
            <div className="flex-1">
              <p className="font-bold text-navy">{tracciatoreLoggato.nome}</p>
              {tracciatoreLoggato.isAdmin && <p className="text-xs text-verde">Admin</p>}
            </div>
            <button onClick={onLogout} className="text-sm text-gray-400 underline">Esci</button>
          </div>

          <div>
            <button
              onClick={() => navigate('/cestino')}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center text-left"
            >
              <span className="font-medium text-gray-800">🗑️ Cestino</span>
            </button>
            <p className="text-sm text-rosso mt-1.5 px-1">
              Rimuovi blocchi/vie dal cestino SOLO nel caso di averli creati per errore.{' '}
              <span className="font-bold">
                l'eliminazione è definitiva e il blocco/via non apparirà nelle statistiche
              </span>
              .
            </p>
          </div>

          {tracciatoreLoggato.isAdmin && (
            <button
              onClick={() => navigate('/recupero-admin')}
              className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center text-left"
            >
              <span className="font-medium text-gray-800">🛡️ Recupero admin</span>
            </button>
          )}

          {tracciatoreLoggato.isAdmin && <AdminPanel />}
        </div>
      )}
    </div>
  )
}
