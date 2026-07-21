# Climbing Free — A.S.D. Colle Salario

## Setup da desktop (prima volta)

1. **Crea il repo su GitHub**
   - Nome: `colle-salario-tracciatura`
   - Pubblico
   - NON inizializzarlo con README/gitignore (li abbiamo già qui)

2. **Crea il progetto Firebase**
   - Vai su [console.firebase.google.com](https://console.firebase.google.com) → "Aggiungi progetto"
   - Nome progetto: `colle-salario-tracciatura` (o simile)
   - Google Analytics: non serve, puoi disattivarlo

3. **Abilita Authentication anonima**
   - Nel progetto → Build > Authentication → "Get started"
   - Tab "Sign-in method" → abilita il provider **"Anonymous"**

4. **Crea il database Firestore**
   - Build > Firestore Database → "Create database"
   - Scegli **"Start in production mode"** (non "test mode": useremo le nostre regole)
   - Regione: una in Europa (es. `eur3` o `europe-west`)

5. **Applica le Security Rules**
   - ⚠️ Prima di pubblicare le regole, imposta la password condivisa
     seguendo i punti 1-2 della sezione "Password condivisa per i
     tracciatori" più sotto — le regole negano l'accesso finché
     `config/authGate` non esiste.
   - Nella sezione Firestore Database → tab "Rules"
   - Cancella il contenuto di default e incolla tutto il contenuto di `firestore.rules`
   - Clicca "Publish"

6. **Crea i 6 tracciatori iniziali**
   - Firestore Database → tab "Data" → "Start collection" → nome collezione: `tracciatori`
   - Crea 6 documenti (ID auto-generato va bene), ognuno con questi campi:
     - `nome` (string): Gabriele / Simone / Davidino / Piddu / Fausta / Paoletto
     - `isAdmin` (boolean): `true` per almeno uno di loro (es. Gabriele), `false` per gli altri
   - Nota: questo è l'unico passo "a mano" — dopo, la gestione tracciatori si fa dall'app (Profilo > admin)

7. **Registra una Web App e copia la configurazione**
   - Project Settings (icona ingranaggio) > General > "Your apps" → icona `</>` (Web)
   - Nickname app: qualsiasi, es. `tracciatura-web`
   - **NON** serve Firebase Hosting (usiamo GitHub Pages)
   - Copia i valori mostrati in `firebaseConfig`

8. **Configura le variabili d'ambiente**
   - Copia `.env.example` in `.env`
   - Incolla i valori copiati al punto 7 (vedi commenti nel file per capire quale campo va dove)

9. **Configura i secrets su GitHub** (per il deploy automatico)
   - Repo > Settings > Secrets and variables > Actions
   - Aggiungi gli stessi 6 secrets elencati in `.env.example` (stessi nomi, stessi valori)

10. **Abilita GitHub Pages**
    - Repo > Settings > Pages > Source: "GitHub Actions"

11. **Primo push**
    ```bash
    npm install
    git init
    git add .
    git commit -m "Setup iniziale progetto (Firebase)"
    git branch -M main
    git remote add origin https://github.com/<tuo-utente>/colle-salario-tracciatura.git
    git push -u origin main
    ```
    Il workflow in `.github/workflows/deploy.yml` farà automaticamente build + deploy ad ogni push su `main`.

12. **Sviluppo locale** (facoltativo, richiede desktop)
    ```bash
    npm run dev
    ```

## Password condivisa per i tracciatori

Da questa versione, scegliere il proprio nome nel selettore non basta più
per ottenere diritti di scrittura: serve anche inserire una password
condivisa (uguale per tutti e sei i tracciatori). La verifica è vincolante
lato Firestore Security Rules (non solo lato app): vedi `passwordSbloccata()`
in `firestore.rules` per i dettagli tecnici.

**Ordine di attivazione (importante, va rispettato in questo ordine):**

1. Genera una service account key dalla Firebase Console: Project Settings
   (ingranaggio) → tab "Service accounts" → "Generate new private key".
   Salva il file scaricato come `serviceAccountKey.json` nella root del
   progetto (è già escluso da `.gitignore`, non finisce mai su GitHub).
2. Imposta la password iniziale:
   ```bash
   npm install
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
     node scripts/set-shared-password.mjs "<la-password-condivisa-scelta>"
   ```
   (sostituisci `<la-password-condivisa-scelta>` con la passphrase reale —
   non scriverla mai in questo file né altrove nel repo pubblico; vedi
   commenti in testa allo script per i dettagli).
3. **Solo dopo** aver eseguito il punto 2, pubblica le regole aggiornate:
   Firestore Database → tab "Rules" → incolla il contenuto di
   `firestore.rules` → "Publish" (stesso procedimento del punto 5 sopra).
   Se pubblichi le regole PRIMA di aver impostato la password, nessuno —
   nemmeno l'admin — potrà più sbloccarsi dall'app, perché le regole
   negano l'accesso finché `config/authGate` non esiste.

**Per cambiare la password in futuro:** solo l'admin (Masa) può farlo,
rieseguendo il comando del punto 2 con la nuova passphrase (nessuna
interfaccia in-app prevista). In alternativa, è possibile intervenire
manualmente su Firestore Console modificando il campo `passwordHash` del
documento `config/authGate` con un hash SHA-256 esadecimale calcolato a
mano. Cambiare la password non disconnette i device già sbloccati in
precedenza (restano validi finché non fanno logout): per revocare un
device specifico, cancella a mano il suo documento in `unlockAttempts`.

## Nota su Firestore e i filtri

A differenza di Postgres, Firestore richiede un **indice composito** ogni
volta che una query combina un filtro (es. settore, colore, tracciatore)
con un ordinamento su un campo diverso (la data) — succede quindi **anche
con un solo filtro attivo alla volta** nella Home, non solo quando se ne
combinano più insieme. Non è un errore bloccante: la prima volta che provi
ogni filtro, se manca l'indice, la console del browser mostra un link
diretto per crearlo in un click (ci vuole circa un minuto per attivarsi).
Conviene provare tutti i filtri della Home una volta a testare, subito dopo
il primo deploy, così gli indici sono già pronti quando li userà la squadra.
Le query di Statistiche ed Esporta CSV non hanno questo problema (non
combinano filtro + ordinamento su campi diversi).

## Stato del progetto

- [x] Firestore Security Rules (`firestore.rules`)
- [x] Logo SVG (`public/logo.svg`)
- [x] Struttura progetto React + Tailwind + GitHub Actions
- [x] Login (auth anonima Firebase + selezione tracciatore)
- [x] Home / lista card boulder
- [x] Filtri (colore, settore, tracciatore)
- [x] Form creazione/aggiornamento boulder
- [x] Statistiche/dashboard
- [x] Export CSV (admin)
- [x] Navigazione (bottom tab bar / sidebar) + Profilo/gestione admin

## Differenze rispetto alla versione Supabase (per chi la conosceva)

- Niente più tabelle SQL/JOIN: ogni documento `boulder` contiene già lo
  stato corrente (denormalizzato), aggiornato in scrittura atomica insieme
  alla nuova voce di `storico` — elimina il rischio di "boulder fantasma"
  che avevamo segnalato con Supabase.
- Login basato su autenticazione anonima Firebase, non più su un token
  custom passato via header HTTP.
- Permessi admin sempre verificati "dal vivo" sul documento tracciatori
  (mai una copia nella cache locale), quindi una retrocessione admin è
  effettiva immediatamente.
