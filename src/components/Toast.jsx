export default function Toast({ messaggio, testoAzione, onAzione }) {
  return (
    <div className="fixed left-4 right-4 bottom-20 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex justify-center sm:justify-end">
      <div className="bg-navy text-white rounded-full pl-4 pr-2 py-2 shadow-lg flex items-center gap-3 max-w-sm w-full sm:w-auto">
        <span className="text-sm flex-1">{messaggio}</span>
        <button
          onClick={onAzione}
          className="text-sm font-semibold text-giallo px-3 py-1.5 rounded-full hover:bg-white/10 shrink-0"
        >
          {testoAzione}
        </button>
      </div>
    </div>
  )
}
