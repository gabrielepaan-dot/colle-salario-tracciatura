import { useEffect, useState } from 'react'

// Chiave localStorage unica, condivisa tra area pubblica e area autenticata:
// una volta chiusa (o dopo il click su "Installa", qualunque sia l'esito),
// la card non deve più ricomparire su questo device/browser.
const CHIAVE_DISMISS = 'installPromptDismissed'

function appGiaInstallata() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  const ua = window.navigator.userAgent
  // iPadOS moderno si presenta come "Macintosh": lo distinguiamo da un vero Mac
  // via il supporto multi-touch, assente su desktop.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

// Card di suggerimento installazione PWA, condivisa tra /pubblico e area
// autenticata (rischio di regressione minimo: overlay isolato, non una vista
// intera — non segue quindi il pattern "duplica invece di refactorizzare").
// `top` permette al chiamante di posizionarla sotto eventuali badge fissi
// già presenti in quel punto dell'app.
export default function InstallPromptCard({ top = 'top-2' }) {
  const [dismesso, setDismesso] = useState(() => !!localStorage.getItem(CHIAVE_DISMISS))
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [ios] = useState(isIOS)

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  function chiudi() {
    localStorage.setItem(CHIAVE_DISMISS, '1')
    setDismesso(true)
  }

  async function installa() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    chiudi()
  }

  if (dismesso || appGiaInstallata()) return null
  if (!ios && !deferredPrompt) return null

  return (
    <div className={`fixed ${top} left-2 right-2 sm:left-52 sm:right-4 z-40`}>
      <div className="bg-white rounded-2xl shadow-lg p-3 flex items-start gap-3">
        <img
          src="./icon-192.png"
          alt=""
          className="w-11 h-11 rounded-xl shrink-0"
          style={{ background: '#0c1445' }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-barlow font-semibold text-navy text-base leading-tight">
            Installa Climbing Free
          </p>
          {ios ? (
            <p className="font-worksans text-xs text-gray-500 mt-1">
              1. Tocca Condividi{' '}
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                className="inline-block align-text-bottom"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <rect x="4" y="12" width="16" height="8" rx="2" />
              </svg>{' '}
              — 2. Scegli "Aggiungi a Home"
            </p>
          ) : (
            <p className="font-worksans text-xs text-gray-500 mt-1">
              Aggiungila alla home per aprirla come un'app, senza passare dal browser.
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {!ios && (
              <button
                type="button"
                onClick={installa}
                className="px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-medium active:scale-95 transition"
              >
                Installa
              </button>
            )}
            <button type="button" onClick={chiudi} className="text-xs text-gray-400 underline">
              {ios ? 'Ho capito' : 'Non ora'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={chiudi}
          aria-label="Chiudi"
          className="text-gray-300 hover:text-gray-500 shrink-0 text-lg leading-none px-0.5"
        >
          ×
        </button>
      </div>
    </div>
  )
}
