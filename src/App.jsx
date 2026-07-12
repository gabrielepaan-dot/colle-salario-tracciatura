import { useState } from 'react'
import { useAuth } from './lib/useAuth'
import LoginScreen from './components/LoginScreen'
import Home from './components/Home'
import Statistiche from './components/Statistiche'
import Profilo from './components/Profilo'
import BottomNav from './components/BottomNav'

export default function App() {
  const { tracciatore, loading, login, logout, error } = useAuth()
  const [mostraLogin, setMostraLogin] = useState(false)
  const [vista, setVista] = useState('home') // 'home' | 'filtri' | 'statistiche' | 'profilo'
  const [mostraFiltri, setMostraFiltri] = useState(false)

  // Il tab "Filtri" non è una pagina a sé: resta sulla Home ma apre il
  // pannello filtri già presente lì (evita di duplicare la UI dei filtri).
  function cambiaVista(nuovaVista) {
    if (nuovaVista === 'filtri') {
      setVista('home')
      setMostraFiltri(true)
    } else {
      setVista(nuovaVista)
    }
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

      {vista === 'home' && (
        <Home
          tracciatoreLoggato={tracciatore}
          mostraFiltri={mostraFiltri}
          setMostraFiltri={setMostraFiltri}
        />
      )}
      {vista === 'statistiche' && <Statistiche tracciatoreLoggato={tracciatore} />}
      {vista === 'profilo' && (
        <Profilo
          tracciatoreLoggato={tracciatore}
          onApriLogin={() => setMostraLogin(true)}
          onLogout={logout}
        />
      )}
    </div>
  )
}
