import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // Non blocca l'app in dev, ma segnala subito se manca la config
  console.error(
    'Config Firebase mancante: crea un file .env con le chiavi VITE_FIREBASE_* (vedi .env.example)'
  )
}

// Nota: questi valori sono pensati per essere pubblici (finiscono nel bundle
// JS visibile a chiunque, come l'anon key di Supabase). La sicurezza vera
// è nelle Firestore Security Rules (firestore.rules), non nel nasconderli.
export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// App Check (reCAPTCHA v3): livello aggiuntivo, complementare alle Security
// Rules, per attestare che le richieste a Firestore arrivino dall'app vera
// e non da script/bot. In sviluppo locale (npm run dev) Firebase non accetta
// token reCAPTCHA per il dominio "localhost": si usa invece un debug token,
// generato automaticamente e stampato in console al primo avvio — va
// registrato una tantum in Firebase Console (App Check > gestisci token di
// debug) perché il flusso locale continui a funzionare.
// L'enforcement (bloccare le richieste senza token valido) NON si attiva da
// qui: è un interruttore separato in Firebase Console (Firestore > App
// Check), lasciato volutamente in modalità "monitor" finché non viene
// attivato manualmente.
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
}

const recaptchaSiteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY
if (recaptchaSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
} else {
  console.error(
    'VITE_FIREBASE_RECAPTCHA_SITE_KEY mancante: App Check non è attivo (vedi .env.example).'
  )
}
