export default function ConfermaDialog({
  titolo,
  messaggio,
  onConferma,
  onAnnulla,
  inCorso,
  testoConferma = 'Rimuovi',
  testoInCorso = 'Rimozione...',
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5">
        <h2 className="text-lg font-bold text-navy mb-2">{titolo}</h2>
        <p className="text-sm text-gray-600 mb-5">{messaggio}</p>
        <div className="flex gap-2">
          <button
            onClick={onAnnulla}
            disabled={inCorso}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={onConferma}
            disabled={inCorso}
            className="flex-1 py-2.5 rounded-xl bg-rosso text-white text-sm font-medium disabled:opacity-50"
          >
            {inCorso ? testoInCorso : testoConferma}
          </button>
        </div>
      </div>
    </div>
  )
}
