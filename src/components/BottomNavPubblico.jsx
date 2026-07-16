const VOCI = [
  { id: 'home', label: 'Home', icona: '🧗' },
  { id: 'tutti', label: 'Tutti i boulder e le vie', icona: '📋' },
]

// Bottom nav della Vista pubblica (#/pubblico): solo 2 voci, niente
// Statistiche/Profilo. Non riusa BottomNav.jsx con prop condizionali, per
// non intrecciare la logica auth/pubblica in un solo componente.
export default function BottomNavPubblico({ vista, onCambiaVista }) {
  return (
    <>
      {/* Mobile: bottom tab bar fissa */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {VOCI.map((v) => (
          <button
            key={v.id}
            onClick={() => onCambiaVista(v.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs ${
              vista === v.id ? 'text-navy font-semibold' : 'text-gray-400'
            }`}
          >
            <span className="text-lg leading-none">{v.icona}</span>
            {v.label}
          </button>
        ))}
      </nav>

      {/* Desktop: sidebar a sinistra, stesso ordine di voci */}
      <nav className="hidden sm:flex sm:flex-col sm:fixed sm:top-0 sm:left-0 sm:bottom-0 sm:w-48 sm:border-r sm:border-gray-200 sm:bg-white sm:py-6 sm:px-3 sm:gap-1 z-40">
        {VOCI.map((v) => (
          <button
            key={v.id}
            onClick={() => onCambiaVista(v.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${
              vista === v.id ? 'bg-navy text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{v.icona}</span>
            {v.label}
          </button>
        ))}
      </nav>
    </>
  )
}
