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
import BottomNavPubblico from './components/BottomNavPubblico'
import PubblicoTuttiBoulder from './components/PubblicoTuttiBoulder'
import PubblicoSettoreDetail from './components/PubblicoSettoreDetail'

function AppShell() {
  const { tracciatore, unlocked, loading, login, unlock, logout, error } = useAuth()
  const [vista, setVista] = useState('home') // 'home' | 'filtri' | 'statistiche' | 'profilo'
  const [vistaPubblico, setVistaPubblico] = useState('home') // 'home' | 'tutti'
  const navigate = useNavigate()
  const location = useLocation()

  // Le tab della bottom nav vivono tutte sulla route "/": se l'utente le
  // clicca mentre è nel dettaglio di un settore, si torna anche a "/".
  function cambiaVista(nuovaVista) {
    setVista(nuovaVista)
    if (location.pathname !== '/') navigate('/')
  }

  function cambiaVistaPubblico(nuovaVista) {
    setVistaPubblico(nuovaVista)
    if (location.pathname !== '/pubblico') navigate('/pubblico')
  }

  // Vista pubblica (#/pubblico): nessun gate password, mai Firestore diretto
  // (solo lo snapshot JSON statico, vedi src/lib/pubblicoSnapshot.js). Va
  // controllata PRIMA del gate di login/unlock qui sotto, altrimenti un
  // device già collegato a un tracciatore ma bloccato vedrebbe comunque la
  // richiesta password anche su questa route pubblica.
  if (location.pathname.startsWith('/pubblico')) {
    return (
      <div className="sm:pl-48">
        <span className="fixed top-2 right-2 z-50 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-navy text-white shadow">
          Vista pubblica
        </span>
        <BottomNavPubblico vista={vistaPubblico} onCambiaVista={cambiaVistaPubblico} />
        <Routes>
          <Route
            path="/pubblico"
            element={
              vistaPubblico === 'home' ? (
                <HomeSelezione boulderTo="/pubblico/boulder" cordaTo="/pubblico/corda" verbo="scaliamo" />
              ) : (
                <PubblicoTuttiBoulder />
              )
            }
          />
          <Route
            path="/pubblico/boulder"
            element={<GrigliaSettori tipo="boulder" backTo="/pubblico" settorePathBase="/pubblico/settore" />}
          />
          <Route
            path="/pubblico/corda"
            element={<GrigliaSettori tipo="corda" backTo="/pubblico" settorePathBase="/pubblico/settore" />}
          />
          <Route path="/pubblico/settore/:slug" element={<PubblicoSettoreDetail />} />
        </Routes>
      </div>
    )
  }

  // Stato di sblocco non ancora noto: nessun contenuto autenticato deve
  // apparire prima di aver verificato tracciatore + unlockAttempts (evita
  // flash di Home/Statistiche/altro).
  if (loading) {
    return <div className="min-h-screen bg-gray-50" />
  }

  // Non sbloccato: nome non ancora scelto e/o password non ancora
  // verificata su questo device. nomeFisso salta la griglia nomi quando
  // il nome è già noto (device già collegato a un tracciatore).
  if (!tracciatore || !unlocked) {
    return <LoginScreen onLogin={login} onUnlock={unlock} loginError={error} nomeFisso={tracciatore?.nome} />
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
                <Profilo tracciatoreLoggato={tracciatore} onLogout={logout} />
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
