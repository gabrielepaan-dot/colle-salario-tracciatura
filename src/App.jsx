import { useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import LoginScreen from './components/LoginScreen'
import Home from './components/Home'
import SettoreDetail from './components/SettoreDetail'
import TuttiBoulder from './components/TuttiBoulder'
import Statistiche from './components/Statistiche'
import Profilo from './components/Profilo'
import BottomNav from './components/BottomNav'

function AppShell() {
  const { tracciatore, login, logout, error } = useAuth()
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

  if (mostraLogin && !tracciatore) {
    return (
      <LoginScreen
        onLogin={async (nome) => {
          const ok = await login(nome)
          if (ok) setMostraLogin(false)
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
              {vista === 'home' && <Home />}
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
        <Route path="/settore/:slug" element={<SettoreDetail tracciatoreLoggato={tracciatore} />} />
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
