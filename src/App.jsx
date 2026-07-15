import { useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import LoginScreen from './components/LoginScreen'
import HomeSelezione from './components/HomeSelezione'
import GrigliaSettori from './components/GrigliaSettori'
import SettoreDetail from './components/SettoreDetail'
import TuttiBoulder from './components/TuttiBoulder'
import Statistiche from './components/Statistiche'
import Profilo from './components/Profilo'
import Cestino from './components/Cestino'
import BottomNav from './components/BottomNav'

function AppShell() {
  const { tracciatore, unlocked, login, unlock, logout, error } = useAuth()
  const [mostraLogin, setMostraLogin] = useState(false)
  const [vista, setVista] = useState('home') // 'home' | 'filtri' | 'statistiche' | 'profilo'
  const navigate = useNavigate()
  const location = useLocation()

  // Le tab della bottom nav vivono tutte sulla route "/": se l'utente le
  // clicca mentre è nel dettaglio di un settore, si torna anche a "/".
  function cambiaVista(nuovaVista) {
    setVista(nuovaVista)
    if (location.pathname !== '/') navigate('/')
  }

  // Device già collegato a un tracciatore (anche da prima dell'introduzione
  // della password condivisa) ma non ancora sbloccato su questo device:
  // si chiede solo la password, il nome è già noto.
  if (tracciatore && !unlocked) {
    return <LoginScreen onLogin={login} onUnlock={unlock} loginError={error} nomeFisso={tracciatore.nome} />
  }

  if (mostraLogin && !tracciatore) {
    return (
      <LoginScreen
        onLogin={async (nome) => {
          const risultato = await login(nome)
          if (risultato === true) setMostraLogin(false)
          return risultato
        }}
        onUnlock={async (password) => {
          const ok = await unlock(password)
          if (ok) setMostraLogin(false)
          return ok
        }}
        loginError={error}
      />
    )
  }

  return (
    <div className="sm:pl-48">
      <BottomNav vista={vista} onCambiaVista={cambiaVista} />

      <Routes>
        <Route
          path="/"
          element={
            <>
              {vista === 'home' && <HomeSelezione />}
              {vista === 'filtri' && <TuttiBoulder tracciatoreLoggato={tracciatore} />}
              {vista === 'statistiche' && <Statistiche tracciatoreLoggato={tracciatore} />}
              {vista === 'profilo' && (
                <Profilo
                  tracciatoreLoggato={tracciatore}
                  onApriLogin={() => setMostraLogin(true)}
                  onLogout={logout}
                />
              )}
            </>
          }
        />
        <Route path="/boulder" element={<GrigliaSettori tipo="boulder" />} />
        <Route path="/corda" element={<GrigliaSettori tipo="corda" />} />
        <Route path="/settore/:slug" element={<SettoreDetail tracciatoreLoggato={tracciatore} />} />
        <Route path="/cestino" element={<Cestino tracciatoreLoggato={tracciatore} />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}
