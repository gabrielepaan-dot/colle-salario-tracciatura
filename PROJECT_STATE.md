# PROJECT_STATE — Tracciatura Boulder (A.S.D. Colle Salario)

> Documento di riferimento per sessioni di pianificazione. Riflette lo stato
> reale del codice al 2026-08-12 (commit `b84eb26`, **pushato** su `main` —
> confermato 2026-08-23, la nota precedente "solo locale" era superata).
> Include il controllo generale del 2026-07-23 (vedi sezione 9,
> commit `8f71042`), quattro modifiche mirate del 2026-07-30 (vedi sezione
> 10, commit `056d957`, `d2145ad`, `113745d`, `75478ba`), due feature del
> 2026-07-31 (vedi sezione 11, commit `6335216`, `be37b2a`): vie permanenti
> "Fissa" e data effettiva automatica di pre-apertura stagione; la sessione
> 2026-08-12 (vedi sezione 12, commit `b84eb26`): restrizione admin
> sull'intero ciclo di vita di cancellazione/ripristino delle vie fisse; e la
> sessione 2026-08-23 (vedi sezione 13, nessun commit di codice): wipe totale
> dei dati di test (`boulder`/`storico`) prima dell'apertura al pubblico.
> Firebase App Check in
> modalità enforcement è **attivo** dal 2026-07-30 (flip eseguito e
> verificato lo stesso giorno, vedi sezione 10): `backup-firestore.yml`
> confermato con l'enforcement attivo, `public-snapshot.yml` non ancora
> riverificato con una lettura Firestore reale in fascia attiva (rischio
> considerato basso, stesso pattern Admin SDK già verificato altrove). Non
> contiene segreti: solo nomi di variabili/config, mai valori.
>
> **Questo file non è tracciato in git** (né mai lo è stato — verificato con
> `git log --all --full-history`), così come `AUDIT_REPORT.md`: esistono solo
> nel working tree locale. Se lavori da un clone pulito o da un'altra
> macchina, questo file non c'è — va ricreato o copiato manualmente.
>
> Nome interno/tecnico del progetto (repo GitHub, progetto Firebase): resta
> `colle-salario-tracciatura`. Nome pubblico mostrato nell'app e nel manifest
> PWA dal 2026-07-22: **"Climbing Free"** — i due nomi sono intenzionalmente
> diversi, vedi sezione 1.

## 1. Stack e architettura

- **Frontend**: React 18 + Vite 5, routing con `react-router-dom` v6
  (`HashRouter`, scelto originariamente per compatibilità con GitHub Pages
  senza config server-side — non più stretta necessità dal 2026-07-30, ma
  invariato: nessun motivo per cambiarlo con Firebase Hosting).
  Styling con Tailwind CSS 3. Grafici con `recharts`.
- **Backend**: nessun server proprio — Firebase (Firestore + Authentication
  anonima) usato direttamente dal client. Nessuna Cloud Function.
- **Hosting/deploy**: **solo Firebase Hosting** dal 2026-07-30 (commit
  `75478ba`) — sito aggiuntivo `climbing-free` sul progetto Firebase
  esistente, via `firebase-tools deploy --only hosting` in CI, con un
  service account dedicato a permesso minimo (solo ruolo IAM "Firebase
  Hosting Admin"). URL: `https://climbing-free.web.app`.
  - **GitHub Pages dismesso il 2026-07-30**: pubblicato in parallelo dal
    2026-07-22 al 2026-07-30 (via `actions/upload-pages-artifact` +
    `actions/deploy-pages`, non da un branch persistente `gh-pages`), poi
    "Unpublish" manuale in repo Settings → Pages e job rimosso da
    `deploy.yml`. Motivo: era anche una fonte di richieste Firestore non
    verificate da App Check (dominio `gabrielepaan-dot.github.io` non
    autorizzato sulla site key reCAPTCHA) — bloccante per l'enforcement,
    vedi sezione 10.
  - Vite `base` resta **relativo** (`./`): non più strettamente necessario
    con un solo host a radice, ma corretto comunque e a costo zero — non
    cambiato.
- **Repo**: `https://github.com/gabrielepaan-dot/colle-salario-tracciatura`
  (pubblico) — nome tecnico, invariato dalla migrazione hosting.
- **Firebase project ID**: `colle-salario-tracciatura` — nome tecnico,
  invariato dalla migrazione hosting.
- **Piano Firebase**: Spark (free tier) — nessuna Cloud Function/Admin backend
  in produzione, coerente con l'uso di script locali per operazioni admin.

## 2. Struttura del progetto

```
src/
  App.jsx                    Router radice: gate login/password, route autenticate, route /pubblico separate
  main.jsx                   Entry point React, registra il service worker no-op
  index.css                  Import Tailwind + stile body base

  components/
    LoginScreen.jsx           Selezione nome tracciatore + gate password condivisa (due fasi: nomi → password)
    HomeSelezione.jsx         Schermata radice "Boulder / Corda", riusata anche da /pubblico (props boulderTo/cordaTo/verbo)
    HomeSelezione.css         CSS dedicato per gradienti/animazioni della Home non esprimibili in Tailwind
    GrigliaSettori.jsx        Griglia settori per tipo (boulder/corda), riusata da /pubblico
    SettoreDetail.jsx         Lista boulder di un settore (mini-tabella), creazione/modifica/elimina — solo area autenticata
    TuttiBoulder.jsx          Vista "Filtri": tutti i boulder/vie con filtro tipo + ordinamento — area autenticata
    BoulderForm.jsx           Form modale creazione (multi-colore) / modifica (singolo) boulder o via
    BoulderRow.jsx            Riga densa "stile Excel" condivisa da SettoreDetail/TuttiBoulder/Cestino/viste pubbliche
    Statistiche.jsx           Dashboard: grafico per grado, per settore, classifica tracciatori per periodo (caricato con React.lazy in App.jsx: unica consumatrice di recharts)
    ExportCsv.jsx             Export CSV boulder attivi / storico completo — solo admin, dentro Statistiche
    Profilo.jsx                Card tracciatore loggato, link Cestino, link Vie fisse e Recupero admin (solo admin), monta AdminPanel se admin
    VieFisse.jsx               Pagina solo-admin (route /vie-fisse, dal 2026-07-31): crea boulder/vie "permanenti" (didattiche, non ruotano mai) riusando BoulderForm con permanenteDefault, stessa guardia isAdmin di SottoCestino.jsx
    AdminPanel.jsx             CRUD tracciatori (aggiungi/rimuovi/promuovi admin) — solo admin
    Cestino.jsx                Lista boulder soft-deleted (stato:'rimossa'), ripristino, "elimina definitivamente" (in realtà sposta nel sotto-cestino, vedi SottoCestino.jsx sotto e sezione 5), purge automatico >7gg
    SottoCestino.jsx            Pagina solo-admin (route /recupero-admin): lista boulder con inSottocestino:true, ripristino o hard delete reale (cancella anche lo storico collegato), purge automatico >7gg propria
    ConfermaDialog.jsx         Dialog di conferma generico riusato da eliminazione/cestino
    Toast.jsx                  Toast con azione "Annulla" (usato dal flusso di cancellazione ritardata)
    Avatar.jsx                  Cerchio con iniziale colorato, placeholder v1 (nessun asset immagine)
    GradoStar.jsx               Stellina SVG colorata per il grado (scala 8 colori bianco→nero)
    InstallPromptCard.jsx       Card suggerimento installazione PWA, condivisa (montata sia in area autenticata sia in /pubblico, non segue il pattern "duplica" — vedi sezione 4)
    BottomNav.jsx                Nav app autenticata: Home/Filtri/Statistiche/Profilo (bottom bar mobile, sidebar desktop)
    BottomNavPubblico.jsx        Nav vista pubblica: solo Home/Tutti (componente separato, non condiviso con BottomNav)
    PubblicoTuttiBoulder.jsx     Equivalente read-only di TuttiBoulder, alimentato dallo snapshot JSON statico
    PubblicoSettoreDetail.jsx    Equivalente read-only di SettoreDetail, alimentato dallo snapshot JSON statico

  lib/
    firebase.js                Inizializzazione app/auth/db Firebase da env VITE_FIREBASE_*
    useAuth.js                  Hook di autenticazione: sessione anonima, login (nome), unlock (password), logout
    hash.js                      sha256Hex() via Web Crypto — usato per il gate password condivisa
    colori.js                    Costanti colori prese/grado, liste settori, helper resa colore (bicolore, old, contrasto testo)
    date.js                      Formattazione date (compatta, "tempo fa", differenza giorni), più dataEffettiva() dal 2026-07-31 (vedi sezione 11)
    csv.js                        Generazione e download CSV lato client (con BOM per Excel)
    eliminaBoulder.js             Soft-delete di un boulder (stato: 'rimossa' + metadati rimozione)
    useCancellazioneBoulder.js    Hook stato condiviso per il flusso elimina→conferma→toast annulla→scrittura ritardata
    pubblicoSnapshot.js           Hook che fetcha lo snapshot JSON statico da raw.githubusercontent.com (branch public-data)

scripts/
  set-shared-password.mjs         Imposta/ruota l'hash della password condivisa (richiede Admin SDK + service account)
  migrate-tipo.mjs                 Migrazione one-off: aggiunge tipo:'boulder' ai doc pre-esistenti alla sezione Corda
  rename-gabriele-to-masa.mjs      Migrazione one-off: rinomina un tracciatore e propaga il nome denormalizzato
  rinomina-settori.mjs             Migrazione one-off: rinomina settori esistenti (non ancora descritto in dettaglio qui)
  backup-firestore.mjs             Backup giornaliero completo (tutti i campi/documenti) via client SDK — vedi nota rischio App Check in sezione 5
  generate-public-snapshot.mjs     Genera public-snapshot.json (letto dalla Vista pubblica) da Firestore via Admin SDK
                                    (dal 2026-07-30, prima client SDK — vedi sezione 10)
  lib/finestraPubblicazione.mjs    Decide, per fascia oraria locale di Roma (DST-aware), se il cron deve pubblicare un
                                    nuovo snapshot — usato solo da generate-public-snapshot.mjs (dal 2026-07-30)

.github/workflows/
  deploy.yml                       Build + deploy su Firebase Hosting (unico target dal 2026-07-30, un solo job — prima
                                    due host paralleli con build duplicata, vedi sezione 10)
  public-snapshot.yml              Cron ogni 30 min (07:00-22:30 UTC, finestra larga con margine DST) — la vera decisione
                                    di pubblicare o meno (fasce orarie di Roma) vive in lib/finestraPubblicazione.mjs, non
                                    nel cron stesso (dal 2026-07-30, prima ogni 15 min senza fasce — vedi sezione 10)
  backup-firestore.yml             Backup giornaliero di Firestore su GitHub Releases (retention 30 giorni)

firestore.rules                    Security Rules (vedi sezione 3/4 per la logica)
firestore.indexes.json              Indici compositi Firestore versionati (vedi sezione 3)
firebase.json                       Config Firebase CLI: Firestore rules/indexes + Hosting (sito climbing-free)
public/                             Asset statici (manifest PWA, icone, sw.js no-op)
```

## 3. Schema dati Firestore

Nessuno schema è imposto server-side oltre alle Security Rules (niente
validazione di tipo/shape lato Firestore, tutta la disciplina è lato client).

### `tracciatori/{tracciatoreId}`
Anagrafica dei tracciatori fissi (id documento auto-generato).
- `nome` (string) — univocità solo verificata lato client, non garantita da Firestore
- `isAdmin` (boolean)

Lettura pubblica (`allow read: if true`), scrittura solo admin.

### `tracciatoriByUid/{uid}`
Collegamento 1:1 device (uid anonimo Firebase Auth) → tracciatore scelto al login.
- `tracciatoreId` (string, riferimento a `tracciatori/{id}`)

Lettura pubblica; scrittura solo dal proprietario (`uid == request.auth.uid`)
e solo dopo aver superato il gate password (vedi sotto). `isAdmin` **non**
esiste qui: è sempre letto "dal vivo" da `tracciatori` per evitare
auto-promozione.

### `config/authGate`
Documento singolo, illeggibile e non scrivibile da qualsiasi client
(`allow read, write: if false`), scrivibile solo via Admin SDK
(`scripts/set-shared-password.mjs`).
- `passwordHash` (string, SHA-256 hex della password condivisa)
- `aggiornatoIl` (string ISO)

### `unlockAttempts/{uid}`
Prova che un device conosce la password condivisa. Un documento per uid
anonimo; resta valido finché quell'uid non fa logout.
- `passwordHash` (string) — deve combaciare con `config/authGate.passwordHash` per essere scritto (verificato via `get()` nelle regole)
- `ts` (Timestamp server)

Lettura solo dal proprietario (serve al "ricordami" per non richiedere la
password ad ogni apertura app).

### `boulder/{boulderId}`
Stato **corrente** (denormalizzato) di un boulder o via — un documento per
blocco/via fisicamente esistente in parete, non uno storico di eventi.
- `settore` (string, uno dei valori in `LISTA_SETTORI` o `LISTA_SETTORI_CORDA`)
- `tipo` ('boulder' | 'corda')
- `colorePrese` (string, chiave di `COLORI_PRESE` o `COLORI_SPECIALI`)
- `coloreGrado` (string, chiave di `COLORI_GRADO`, facoltativo — può essere `''`)
- `old` (boolean, applicabile solo se `supportaOld(colorePrese)`)
- `stato` ('attiva' | 'rimossa') — soft-delete, mai altri valori
- `note` (string | null)
- `tracciatoreId` (string | null — null se attribuito a "Altri")
- `tracciatoreNome` (string, denormalizzato da `tracciatori.nome` al momento del salvataggio — **non** si aggiorna retroattivamente se il tracciatore cambia nome o viene rimosso, tranne quando uno script di migrazione lo fa esplicitamente)
- `dataUltimoCambio` (string ISO `YYYY-MM-DD`, data dell'evento più recente registrato — non necessariamente "oggi"; forzata al 1 settembre 2026 se scritta prima di quella data, salvo `permanente: true` — vedi sezione 11)
- `creatoIl` (Timestamp server, impostato solo alla creazione; stessa forzatura pre-apertura di `dataUltimoCambio`, vedi sezione 11)
- `permanente` (boolean, opzionale, dal 2026-07-31 — vedi sezione 11) — assente/`false` su tutti i documenti precedenti a quella data, nessuna migrazione eseguita. `true` solo per boulder/vie didattiche create dalla sezione admin `VieFisse.jsx`: bypassano sempre la data effettiva di pre-apertura (mantengono `creatoIl`/`dataUltimoCambio` reali) ma altrimenti si comportano come un boulder/via normale ovunque (Statistiche non li esclude/filtra mai).
- `rimossoDa` (string | null, id tracciatore), `rimossoDaNome` (string | null), `rimossoIl` (Timestamp | null) — presenti solo se `stato === 'rimossa'`
- `inSottocestino` (boolean, opzionale) — impostato da `Cestino.jsx` quando si preme "Elimina definitivamente": nonostante il nome, **non** cancella nulla, sposta solo il boulder nella vista solo-admin `SottoCestino.jsx` (vedi bug noto in sezione 5). `sottocestinoIl` (Timestamp | null) e `sottocestinoDa` (string | null, nome tracciatore) accompagnano il flag.

Lettura pubblica sempre. Creazione/aggiornamento dietro gate password, ma
**non** se `inSottocestino: true` (in quel caso solo admin, vedi Security
Rules). Cancellazione reale (`delete`) permessa solo se `resource.data.stato
== 'rimossa'`, e se `inSottocestino: true` solo admin può farla.

### `storico/{storicoId}`
Log immutabile di eventi (una riga per ogni creazione; le modifiche
**non** generano righe qui, solo la creazione iniziale). Alimenta
Statistiche/classifica/Export CSV — mai riscritto in update.
- `boulderId` (string, riferimento a `boulder/{id}`)
- `settore`, `tipo`, `colorePrese`, `coloreGrado`, `stato`, `note` — snapshot al momento dell'evento
- `tracciatoreId` (string | null), `tracciatoreNome` (string) — a chi è attribuito il boulder
- `eseguitoDaUid` (string | null), `eseguitoDaNome` (string | null) — chi ha fisicamente inserito il dato (può differire da tracciatoreNome, es. "Altri"). `eseguitoDaUid` è vincolato dalle Security Rules a combaciare **sempre** con `request.auth.uid` di chi scrive (non falsificabile lato client); `tracciatoreId`/`tracciatoreNome` invece restano liberi, per design (vedi bug noto in sezione 5).
- `dataEvento` (string ISO `YYYY-MM-DD`)
- `creatoIl` (Timestamp server)

Lettura pubblica; scrittura/correzione dietro gate password (più il vincolo
su `eseguitoDaUid` sopra); cancellazione solo admin (usata dall'hard delete
reale in `SottoCestino.jsx` per ripulire lo storico associato a un boulder
eliminato in modo permanente).

### Indici compositi
`firestore.indexes.json` versionato nel repo (dal 2026-07-20), non più
creati solo manualmente in console. Le uniche query del codice che
richiedono davvero un indice composito sono `SettoreDetail` (`settore` +
`stato` + `orderBy(dataUltimoCambio)`) e `TuttiBoulder` (`tipo` + `stato` +
`orderBy(dataUltimoCambio)`), entrambe in entrambe le direzioni asc/desc —
coperte. Tutte le altre query nel codice (Cestino, SottoCestino, Statistiche,
ExportCsv, LoginScreen, AdminPanel, useAuth) usano un solo filtro di
uguaglianza o un solo `orderBy` senza filtro, quindi sfruttano gli indici
single-field automatici di Firestore, non quelli versionati qui. La query di
`Cestino` in particolare evita volutamente l'`orderBy` lato Firestore (ordina
in JS) proprio per non richiedere un altro indice.

**Indici orfani (presenti nel file ma non usati da nessuna query attuale del
codice, confermato con un confronto reale il 2026-07-23)**: 6 dei 10 indici
in `firestore.indexes.json` — `colorePrese+dataUltimoCambio`,
`settore+dataUltimoCambio` (senza `stato`), `stato+dataUltimoCambio` (asc e
desc, senza `settore`/`tipo`), `tracciatoreId+dataUltimoCambio`, e
`storico: tipo+dataEvento` (nessuna query filtra `tipo` e ordina per
`dataEvento` insieme). Nessuna azione presa: rimuoverli è una scelta di
design lasciata a una sessione dedicata, non impattano la correttezza (solo
storage/manutenzione).

## 4. Feature implementate

- **Login a due fasi**: sessione anonima Firebase automatica ad ogni
  apertura → scelta nome tracciatore (`tracciatoriByUid`) → gate password
  condivisa (`unlockAttempts`), unica per tutti e sei i tracciatori.
  L'unlock persiste finché non si fa logout esplicito (non per sessione
  browser). Se il device era già collegato a un nome prima dell'
  introduzione della password (retrocompatibilità), salta direttamente
  alla schermata password.
- **Home Boulder/Corda**: schermata di scelta iniziale con grafica dedicata
  (gradiente, curva SVG animata), riusata identica (via props) sia
  nell'app autenticata sia nella vista pubblica.
- **Tracciatura per settore**: griglia settori (10 per Boulder, 10 "Corda 1..10"
  per Corda) → dettaglio settore con mini-tabella densa colorata, creazione
  multi-colore in un solo salvataggio (N boulder/vie da un'unica selezione di
  colori, ognuno con grado/tracciatore indipendenti), modifica singola.
- **Colori prese**: 12 colori base + 5 "speciali" (3 bicolore con swatch a
  gradiente hard-stop, 2 pieni) in un accordion separato. Toggle "OLD" per i
  10 colori base che lo supportano (esclusi i due gialli chiari), reso con
  filtro CSS desaturato — non applicabile ai colori speciali.
  "Giallo old" è uno speciale a sé, non un flag su "giallo fluo".
- **Colore leggibilità testo**: calcolo automatico contrasto WCAG
  (bianco/nero) sullo sfondo colorato di ogni riga, inclusa media dei due
  hex per i bicolore.
- **Vista "Filtri" (Tutti i boulder)**: lista globale cross-settore con
  colonna Settore visibile, filtro Tipo (boulder/corda) + ordinamento data.
- **Statistiche**: grafico a barre per grado, grafico a torta per settore
  (solo boulder/vie attivi), classifica tracciatori impilata per grado con
  filtro periodo (settimana/mese/anno/sempre) basato su `storico`.
- **Export CSV** (solo admin): boulder attivi e storico completo, con BOM
  per compatibilità Excel.
- **Cestino / soft-delete unificato**: rimozione di un boulder è sempre
  soft-delete (`stato: 'rimossa'`), mai istantanea — c'è un toast "Annulla"
  di 4.5s prima della scrittura reale su Firestore; se l'utente naviga via
  prima che scada il timer, la cancellazione viene comunque committata subito
  (nessuna perdita "nel nulla"). Dal Cestino: ripristino (torna `attiva`) o
  pulsante **"Elimina definitivamente"**, il cui nome è fuorviante — vedi
  sotto-cestino qui sotto e bug noto in sezione 5, non cancella nulla per
  davvero. Pulizia automatica propria del Cestino: ogni apertura elimina per
  sempre (vedi sotto-cestino) i blocchi rimossi da più di 7 giorni. Se un
  blocco è stato in parete meno di 7 giorni al momento della rimozione,
  "Elimina definitivamente" scatta senza dialog di conferma aggiuntivo (il
  rischio è già basso); altrimenti chiede conferma esplicita.
- **Sotto-cestino (solo admin, route `/recupero-admin`, `SottoCestino.jsx`)**:
  destinazione reale di "Elimina definitivamente" dal Cestino — imposta
  `inSottocestino: true` sul boulder (resta `stato: 'rimossa'`), invisibile e
  non toccabile da un non-admin da quel momento in poi (anche con la password
  condivisa, vedi Security Rules). Da qui un admin può ripristinare (torna
  visibile nel Cestino normale) oppure eseguire l'hard delete reale (`delete`
  Firestore, cancella anche lo storico collegato). Pulizia automatica propria:
  ogni apertura della pagina elimina per sempre i blocchi nel sotto-cestino da
  più di 7 giorni. I blocchi in sotto-cestino sono esclusi dalla classifica
  tracciatori in Statistiche (altrimenti conterebbero comunque dallo storico).
- **Gestione tracciatori (AdminPanel)**: solo admin — aggiungi, rimuovi,
  promuovi/retrocedi admin. Nessun vincolo di unicità reale lato Firestore
  (solo verifica client-side prima dell'inserimento). Rimuovere un
  tracciatore non tocca i dati storici che lo citano (restano leggibili col
  nome denormalizzato).
- **Permessi admin sempre "live"**: mai una copia cached — sia in Security
  Rules sia in UI, lo stato admin viene riletto dal documento `tracciatori`
  ogni volta, quindi una retrocessione è immediata senza re-login.
- **Vista pubblica read-only (`#/pubblico`)**: nessun gate password, mai
  Firestore diretto — legge solo `public-snapshot.json` (statico, pubblicato
  su un branch orfano `public-data`, mai su `main`). Dal 2026-07-30 generato
  a fasce orarie invece che a intervallo fisso — vedi sezione 8 per il
  meccanismo e sezione 5 per la latenza risultante. Include solo Home e
  "Tutti i boulder e le vie" (con filtri aggiuntivi Grado/Tracciatore,
  mutuamente esclusivi — assenti nella vista Filtri autenticata). Badge
  "Vista pubblica" fisso in alto a destra. I campi gestionali (note, stato,
  id, tracciatoreId, creatoIl, rimosso*) sono esclusi dallo snapshot per
  design (invariato dalla migrazione ad Admin SDK: stessa `campiPubblici()`).
- **PWA installabile**: manifest + icone + service worker registrato ma
  "no-op" (nessuna cache/offline — scelta deliberata, l'app richiede sempre
  connessione).
- **Vie permanenti "Fissa"** (dal 2026-07-31, `VieFisse.jsx`): boulder/vie
  didattiche (poche unità) marcate `permanente: true`, create da una
  sezione admin-only (`/vie-fisse`, link da Profilo, non in bottom nav) che
  riusa `BoulderForm` con `permanenteDefault` invece di duplicare la logica
  di creazione. Badge "· fissa" in `BoulderRow.jsx` (stesso pattern di
  "· old"), propagato anche allo snapshot pubblico. Contano sempre come
  boulder/via normali in Statistiche (nessuna esclusione). Vedi sezione 11.
- **Data effettiva automatica di pre-apertura stagione** (dal 2026-07-31):
  la palestra apre ufficialmente al pubblico l'1 settembre 2026, ma i
  tracciatori tracciano già durante agosto 2026. `dataEffettiva()`
  (`lib/date.js`) forza `boulder.creatoIl`/`dataUltimoCambio` e
  `storico.creatoIl`/`dataEvento` al 1 settembre 2026 finché la data
  odierna (Europe/Rome, DST-aware) precede quella soglia, così i blocchi
  non invecchiano prima dell'apertura vera (Cestino, durata media,
  ordinamento, andamento Statistiche). Si autodisattiva da sola dopo
  l'apertura. Le vie permanenti (sopra) sono l'eccezione esplicita. Vedi
  sezione 11.

## 5. Bug noti e limitazioni

- **Nessuna unicità reale sui nomi tracciatori**: `AdminPanel.aggiungiTracciatore`
  controlla i duplicati solo lato client con una query prima dell'insert —
  due admin che aggiungono lo stesso nome in rapida successione possono
  creare doppioni (nessun vincolo lato Firestore).
- ~~Cambio password non revoca i device già sbloccati~~ — **risolto**
  (Fase 1 audit sicurezza, 2026-07-23): `passwordSbloccata()` in
  `firestore.rules` confronta l'hash salvato in `unlockAttempts/{uid}` con
  quello *corrente* di `config/authGate` (non solo `exists()`), quindi una
  rotazione invalida istantaneamente tutti i device già sbloccati, senza
  bisogno di cancellare nulla a mano. Revoca di un device *specifico* (senza
  ruotare la password per tutti) resta invece solo manuale da Firestore
  Console — nessuna UI in-app per farlo, questa parte non è cambiata.
- **`inSottocestino` impostabile da un non-admin anche fuori dal flusso
  previsto**: la regola di update su `boulder` (`firestore.rules`) controlla
  solo lo stato *attuale* del documento
  (`resource.data.get('inSottocestino', false) != true || isAdmin()`), non
  quello richiesto, e non impone `stato == 'rimossa'`. Chiunque conosca la
  password condivisa può quindi scrivere `inSottocestino: true` direttamente
  via SDK anche su un boulder ancora `attiva`, bypassando il percorso
  Cestino→sotto-cestino previsto dalla UI. Non raggiungibile dalla UI normale,
  effetto pratico limitato (nasconde un blocco, recuperabile da admin), ma le
  Rules non riflettono l'invariante che il codice assume. Segnalato, nessuna
  azione presa (richiede una scelta di design su come vincolare la regola).
- **Messaggio "Elimina definitivamente" nel Cestino è fuorviante**: sia il
  nome della funzione (`eliminaDefinitivamente` in `Cestino.jsx`) sia il testo
  del dialog di conferma ("non potrà essere recuperato") suggeriscono una
  cancellazione reale, ma l'azione si limita a impostare
  `inSottocestino: true` — il blocco resta recuperabile da un admin via
  `SottoCestino.jsx`. Non è un problema di sicurezza, solo un disallineamento
  UI/comportamento.
- **CSV formula injection nell'export** (`ExportCsv.jsx`/`lib/csv.js`):
  l'escape del CSV gestisce virgole/virgolette/a-capo ma non neutralizza un
  primo carattere `=`/`+`/`-`/`@` nel campo libero "note", che Excel/Sheets
  interpretano come inizio formula. Rischio basso (richiede un tracciatore
  con la password condivisa, non uno sconosciuto).
- **`tracciatoreNome` denormalizzato non si aggiorna retroattivamente**: se
  un tracciatore cambia nome (o viene rimosso), tutti i documenti
  `boulder`/`storico` esistenti restano con il nome vecchio, a meno di
  eseguire manualmente uno script di migrazione dedicato (vedi
  `rename-gabriele-to-masa.mjs`, pensato come one-off, non riusabile senza
  modifiche per un nome diverso).
- **Latenza vista pubblica**: dal 2026-07-30 variabile per fascia oraria
  (deliberato, per non consumare quota di lettura Firestore senza
  necessità — vedi sezione 8): nessun aggiornamento 23:00–11:00 ora di
  Roma, fino a ~1h in più durante 11:00–17:00, fino a ~30 min durante
  17:00–22:30 — più l'eventuale cache CDN di `raw.githubusercontent.com`
  in ogni caso. Prima era un intervallo fisso di ~15 minuti indipendente
  dall'ora del giorno.
- ~~`backup-firestore.mjs` non migrato ad Admin SDK~~ — **risolto e
  verificato lo stesso giorno** (2026-07-30, commit `113745d`, vedi
  sezione 10): migrato allo stesso pattern Admin SDK di
  `generate-public-snapshot.mjs`, riusando il secret
  `FIREBASE_SNAPSHOT_ADMIN_KEY` già verificato. Run manuale confermato:
  `Scritto /tmp/backup.json: 113 boulder, 117 storico, 6 tracciatori.`,
  release GitHub pubblicata correttamente.
- **Nuove combinazioni filtro+ordinamento richiedono un nuovo indice**: ogni
  nuova query che combina un filtro con `orderBy` su un campo diverso va
  aggiunta a `firestore.indexes.json` e deployata (non più creata al volo
  dalla sola console).
- **Logica sfondo/testo riga duplicata in 3 file**: `Cestino.jsx`,
  `SottoCestino.jsx` e `BoulderRow.jsx` ripetono lo stesso
  `SFONDO_RIGA_OVERRIDE = { bianco: '#FFFBEB' }`, lo stesso fallback
  `'#374151'` e lo stesso calcolo `testoAttenuato` via `rgba(...)` — nessuno
  dei due colori esiste in `lib/colori.js` (che pure è la single source of
  truth dichiarata per i colori, sezione 7). Andrebbe consolidato lì (come
  `sfondoColorePrese`/`testoLeggibileSu`), ma è una scelta di design non
  presa autonomamente in un controllo generale.
- **Naming inglese residuo in alcuni punti**, contro la convenzione "tutto in
  italiano" (sezione 7): `loading`/`error`/`deleteDoc` in `lib/useAuth.js`
  (propagati come prop `loginError` fino a `App.jsx`/`LoginScreen.jsx`), la
  funzione `handleSubmitPassword` in `LoginScreen.jsx` (accanto a
  `handleScelta`, italiano), e la prop `mode` (`'create'`/`'update'`) passata
  tra `BoulderForm.jsx`/`SettoreDetail.jsx`/`TuttiBoulder.jsx`. Rinominare
  tocca più file contemporaneamente, quindi non applicato in un controllo
  generale — da valutare come sessione dedicata se si vuole coerenza totale.
- **6 dei 10 indici in `firestore.indexes.json` sono orfani** (nessuna query
  attuale li usa) — vedi dettaglio in sezione 3. Solo 2 erano documentati qui
  prima del 2026-07-23; il conteggio reale è più alto.
- **Nessuna suite di test automatizzati** nel repo (né unit né e2e) e
  nessun linting/type-checking configurato in CI — la sola verifica in
  `deploy.yml` è che `npm run build` non fallisca.
- **`serviceAccountKey.json`** deve esistere in locale per usare
  `set-shared-password.mjs` (unico modo per impostare/ruotare la password
  condivisa): è correttamente escluso da `.gitignore`, ma non c'è alcuna
  interfaccia in-app per la rotazione, quindi solo chi ha accesso alla
  Firebase Console del progetto può farlo.
- **Cartella `dist/` presente in locale** (build compilata da un precedente
  `npm run build`): correttamente esclusa da `.gitignore` e non tracciata in
  git — nessuna azione richiesta, solo da tenere a mente se si ispeziona il
  filesystem locale e ci si aspetta una working tree "pulita".
- **`create` con `permanente: true` non vincolato a `isAdmin()` nelle Rules**
  (dal 2026-08-12, vedi sezione 12): un tracciatore con la sola password
  condivisa potrebbe in teoria creare via SDK diretto un boulder con
  `permanente: true`, bypassando `VieFisse.jsx`. Stesso pattern del bug
  `inSottocestino` sopra: non raggiungibile dalla UI normale, lasciato
  fuori scope.
- **Purge automatico 7gg di `Cestino.jsx` senza guardia admin per le vie
  fisse** (dal 2026-08-12, vedi sezione 12): se una via fissa rimossa da un
  admin restasse in Cestino oltre 7 giorni e il purge automatico girasse
  sulla sessione di un tracciatore non-admin, il batch di cancellazione
  fallirebbe per intero (le nuove Rules richiedono `isAdmin()` per il
  `delete` di un documento `permanente: true`). Scenario teorico, non
  osservato; nessuna guardia aggiunta per istruzione esplicita.

## 6. TODO / feature pending

Nessun TODO/FIXME esplicito trovato nel codice sorgente. Unico "pending"
esplicitamente documentato in un commento:
- `Avatar.jsx` è dichiaratamente un placeholder v1 ("stessa forma e colore
  per tutti, solo l'iniziale cambia"): il commento indica che in futuro,
  quando saranno forniti asset personalizzati, il componente potrà mappare
  un'immagine per nome mantenendo la stessa interfaccia (prop `nome`).

Nessuna issue GitHub, nessun branch di lavoro in sospeso oltre `main` e
`public-data` (quest'ultimo generato automaticamente dal workflow, non è
lavoro umano in corso).

**Pending dal 2026-07-30** (vedi sezione 10):
- ~~Creare il GitHub Secret `FIREBASE_SNAPSHOT_ADMIN_KEY` e verificare con
  un run manuale in fascia oraria attiva~~ — **fatto e verificato** lo
  stesso giorno: run manuale delle 11:07 ora di Roma ha letto Firestore
  via Admin SDK (108 boulder/vie) e pubblicato su `public-data`
  (`generatoIl: 2026-07-30T09:07:46.687Z`).
- ~~Prima di attivare App Check: migrare e verificare `backup-firestore.mjs`
  ad Admin SDK~~ — **fatto e verificato** (2026-07-30, commit `113745d`).
- ~~Pending residuo: flip App Check~~ — **fatto e verificato lo stesso
  giorno (2026-07-30)**. L'app essendo ancora in fase di sviluppo (nessun
  utente reale al momento del flip), si è deciso di attivare l'enforcement
  direttamente invece di aspettare che la metrica "outdated requests" si
  stabilizzasse (era scesa da 33% a 29% dopo la dismissione di GitHub
  Pages, ma su un campione troppo piccolo — 10 minuti — per essere
  indicativa). Dopo il flip: test manuale dell'app da
  `climbing-free.web.app` (login, navigazione, CRUD boulder) **funzionante
  correttamente**; poi `workflow_dispatch` manuale di `backup-firestore.yml`
  **terminato con successo** (tutti gli step verdi, incluso `Genera
  backup.json` che legge Firestore per intero via Admin SDK), confermando
  che l'Admin SDK bypassa App Check anche con l'enforcement realmente
  attivo. `public-snapshot.yml` non ancora riverificato con enforcement
  attivo (il run di prova è uscito subito per "fuori fascia oraria" senza
  toccare Firestore) — stesso pattern Admin SDK di `backup-firestore.mjs`
  quindi il rischio residuo è considerato basso, ma andrebbe comunque
  rilanciato durante una fascia attiva (11:00–22:30 ora di Roma) per una
  conferma diretta.

## 7. Pattern e convenzioni adottate

- **Duplicare invece di refactorizzare componenti già in produzione**: le
  viste pubbliche (`PubblicoTuttiBoulder`, `PubblicoSettoreDetail`,
  `BottomNavPubblico`) sono copie indipendenti delle loro controparti
  autenticate, non condivise via prop-branching — scelta esplicita per non
  rischiare regressioni sui componenti usati quotidianamente dai
  tracciatori. Applicare lo stesso criterio a nuove feature "a due modalità".
- **Denormalizzazione con scrittura atomica**: ogni operazione che tocca
  sia lo stato corrente (`boulder`) sia lo storico usa `writeBatch` per
  evitare stati incoerenti (es. creazione: un `boulder` + un `storico` per
  colore, in un solo batch). Le modifiche (update) toccano **solo**
  `boulder`, mai `storico`, per non duplicare i conteggi in classifica.
- **Stato admin sempre riletto "dal vivo"**: mai fidarsi di una copia
  cache/locale per decisioni di permesso — sia le Security Rules
  (`isAdmin()` in `firestore.rules`) sia la UI rileggono il documento
  `tracciatori` corrente.
- **Componenti "riusabili via props di destinazione"**: `HomeSelezione` e
  `GrigliaSettori` accettano prop come `boulderTo`/`cordaTo`/`backTo`/
  `settorePathBase` per restare identici tra area autenticata e `/pubblico`
  senza duplicare il componente intero (a differenza delle viste liste, che
  invece sono duplicate — vedi sopra: il criterio è la superficie di
  rischio, non una regola fissa).
- **Cancellazione ritardata condivisa**: `useCancellazioneBoulder` centralizza
  il pattern elimina→conferma→toast annulla→scrittura, riusato identico da
  `SettoreDetail` e `TuttiBoulder`.
- **Soft-delete come unico percorso di rimozione** per i boulder: mai una
  `delete` diretta dall'interfaccia normale, solo da `Cestino` dopo che lo
  stato è già `rimossa` (anche impostato dalle Security Rules, non solo
  convenzione UI).
- **Colori come "single source of truth" in `lib/colori.js`**: qualunque
  nuovo colore/resa/regola di leggibilità testo *relativo ai colori
  prese/grado* va aggiunto lì. **Non più seguito rigorosamente al
  2026-07-23**: un controllo generale ha trovato hex hardcoded fuori da
  `colori.js` in diversi componenti — la duplicazione più concreta (stesso
  sfondo/testo riga ripetuto in 3 file) è in sezione 5; altri hex isolati
  (palette grafici Statistiche, illustrazione Home) sono probabilmente
  eccezioni legittime (token di brand Tailwind, non colori prese/grado) ma
  non sono stati riconsolidati.
- **Script di migrazione one-off con dry-run di default**: sia
  `migrate-tipo.mjs` sia `rename-gabriele-to-masa.mjs` richiedono `--write`
  esplicito per scrivere, stampano sempre prima i conteggi in dry-run — un
  pattern da replicare per qualunque futura migrazione manuale.
- **Admin SDK per script CI headless, non solo per bypassare le Rules**
  (aggiornato 2026-07-30): `set-shared-password.mjs` usa `firebase-admin`
  perché deve scrivere `config/authGate`, volutamente inaccessibile a
  qualunque client. Dal 2026-07-30 anche `generate-public-snapshot.mjs`
  usa `firebase-admin`, ma per un motivo diverso: bypassare Firebase App
  Check (i dati letti restano pubblici per Security Rules, come prima —
  il problema è che un client SDK headless in CI non può fornire un token
  App Check valido). `backup-firestore.mjs` **non** è stato ancora
  migrato e resta sul client SDK — vedi rischio in sezione 5.
- **Nomi delle variabili/funzioni/commenti in italiano**, coerente in tutto
  il codebase (incluse le Security Rules).
- **Code splitting solo dove i numeri lo giustificano** (dal 2026-07-23):
  `React.lazy`/`Suspense` va applicato a un componente di route solo se
  porta con sé una dipendenza pesante non necessaria al primo caricamento
  (caso applicato: `Statistiche.jsx`, unica consumatrice di `recharts` —
  vedi sezione 2). Non è una regola da applicare per principio a ogni
  componente: `AdminPanel`/`ExportCsv` non hanno dipendenze pesanti proprie
  (solo `firebase`, già necessaria ovunque) e restano import statici.
  Fallback di `Suspense` minimo, stesso pattern del div vuoto già usato per
  lo stato di loading di `useAuth` (`App.jsx`), per non introdurre flash
  percepibili.

## 8. Note operative

### Variabili d'ambiente richieste (nessun valore qui, solo nomi)
Definite in `.env` (locale, gitignored) e come GitHub Secrets (per CI):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_RECAPTCHA_SITE_KEY` — abilita App Check (reCAPTCHA v3);
  se assente, `src/lib/firebase.js` salta `initializeAppCheck` e logga un
  errore in console (App Check resta disattivato, l'app funziona comunque)

Solo GitHub Secret aggiuntivi, non in `.env` locale:
- `FIREBASE_HOSTING_DEPLOY_KEY` — chiave JSON di un service account
  dedicato con solo ruolo IAM "Firebase Hosting Admin" (permesso minimo,
  separato dal service account ampio usato per Firestore Rules/Indici),
  usato dal job `deploy` in `deploy.yml` (unico target dal 2026-07-30).
- `FIREBASE_SNAPSHOT_ADMIN_KEY` (dal 2026-07-30, creato e verificato con
  run reali — vedi sezione 10) — chiave JSON dello stesso service account
  "ampio" già usato per
  `set-shared-password.mjs` (`firebase-adminsdk-fbsvc@...`, nessun nuovo
  ruolo IAM necessario: legge già Firestore). Usato dal workflow
  `public-snapshot.yml`, scritto su file temporaneo in CI e passato via
  `GOOGLE_APPLICATION_CREDENTIALS` allo stesso modo di
  `FIREBASE_HOSTING_DEPLOY_KEY` in `deploy.yml`. Scelta di riuso della
  chiave ampia invece di una dedicata a permesso minimo (`roles/datastore.
  viewer`): più semplice, non ancora rivalutata.

Per `set-shared-password.mjs` in locale (e ora anche per
`generate-public-snapshot.mjs` in locale, dal 2026-07-30) serve
`GOOGLE_APPLICATION_CREDENTIALS` (percorso locale a un file service account
key, mai committato — pattern già coperto da `.gitignore`:
`*serviceAccountKey*.json`, `service-account*.json`).

### Workflow GitHub Actions attivi
- **`deploy.yml`** — trigger: push su `main` o manuale (`workflow_dispatch`).
  Dal 2026-07-30 un solo job `deploy`: build (Vite) poi `firebase-tools
  deploy --only hosting` sul sito `climbing-free`, col service account
  dedicato. Prima erano 3 job (`build` + `deploy` GitHub Pages +
  `deploy-firebase`, con build duplicata) — semplificato alla dismissione
  di GitHub Pages, vedi sezione 1 e 10.
- **`public-snapshot.yml`** — trigger: cron `*/30 7-22 * * *` UTC (dal
  2026-07-30, prima `*/15 * * * *`) o manuale. Finestra UTC volutamente più
  larga del necessario, con margine per CET/CEST; la vera decisione se
  pubblicare (fasce orarie di Roma: mai 23:00–11:00, ogni ora 11:00–17:00,
  ogni 30 min 17:00–22:30) vive in `scripts/lib/finestraPubblicazione.mjs`,
  calcolata a runtime via `Intl.DateTimeFormat`, non nel cron. Rigenera
  `public-snapshot.json` via Admin SDK e lo pubblica (commit + push) sul
  branch orfano `public-data`, **mai** su `main` — per non far scattare
  `deploy.yml` ad ogni rigenerazione. Se fuori fascia o se non è ancora
  passato l'intervallo minimo dall'ultima pubblicazione, esce senza
  generare né pubblicare nulla (nessuna lettura Firestore, nessun commit).
- **`backup-firestore.yml`** — trigger: cron giornaliero o manuale. Backup
  completo di Firestore, pubblicato come GitHub Release (`backup-YYYY-MM-DD`),
  retention 30 giorni.

### Ordine di attivazione critico per la password condivisa
Documentato in `README.md`: bisogna impostare `config/authGate` (via
`set-shared-password.mjs`) **prima** di pubblicare `firestore.rules`
aggiornate — altrimenti nessuno, admin incluso, può più sbloccarsi (le
regole negano l'accesso finché `config/authGate` non esiste).

### Script di manutenzione disponibili (tutti manuali da terminale)
- `node scripts/set-shared-password.mjs "<password>"` — richiede
  `GOOGLE_APPLICATION_CREDENTIALS` verso il service account key.
- `node scripts/migrate-tipo.mjs [--write]` — dry-run di default.
- `node scripts/rename-gabriele-to-masa.mjs [--write]` — dry-run di default,
  specifico per la migrazione Gabriele→Masa (non generico/parametrizzato).
- `node scripts/generate-public-snapshot.mjs [percorso-output.json]` — dal
  2026-07-30 richiede `GOOGLE_APPLICATION_CREDENTIALS` (Admin SDK, prima
  usava `.env`/VITE_FIREBASE_*). Normalmente eseguito dal workflow cron,
  ma eseguibile anche manualmente in locale; controlla comunque la fascia
  oraria prima di leggere Firestore (vedi sezione 10).

### Sviluppo locale
`npm install` poi `npm run dev` (Vite, porta 5173 di default — configurata
anche in `.claude/launch.json` per il preview integrato).

## 9. Controllo generale 2026-07-23 — stato di `AUDIT_REPORT.md` e cosa è cambiato

`AUDIT_REPORT.md` (locale, non tracciato in git — vedi nota in cima a questo
file) è datato 2026-07-17, **prima** delle Fasi 1-3 dell'audit sicurezza.
Va letto come riferimento storico, non come stato attuale: le voci 1.1
(rate limiting), 1.2 (revoca su rotazione password) e 1.7 (indici non
versionati) sono **risolte**; 1.6 (`tracciatoreNome` azzerato) è risolta;
1.3 (validazione schema `boulder`/`storico`) è **parziale** (solo
`eseguitoDaUid` su `storico` è vincolato dalle Rules). Le voci 1.4, 1.5, 1.8,
1.9, 1.10 restano aperte e sono riportate aggiornate nella sezione 5 qui
sopra, con riferimenti a file/riga correnti (non quelli del 2026-07-17, che
nel frattempo sono scivolati).

Un controllo generale (non una feature specifica) in questa data ha
verificato a tutto tondo: nessuna regressione nelle Security Rules rispetto
allo stato Fasi 1-3; nessuna combinazione filtro+`orderBy` nel codice priva
di indice (nessun rischio bloccante); parità visiva pubblico/autenticato
dopo il code splitting di `Statistiche` (badge, `InstallPromptCard`,
bottom nav, back button — verificati dal vivo in `/pubblico`, verificati via
codice nell'area autenticata per mancanza di credenziali di test); build
invariata (717 KB + 425 KB gzip, stesso warning noto). Applicati 4 micro-fix
isolati (2 import morti in `lib/eliminaBoulder.js` e `lib/useAuth.js`, 2
colori hardcoded sostituiti con costanti esistenti in `GradoStar.jsx` e
`InstallPromptCard.jsx`), commit separati, pushati su `main`. Tutto il resto
emerso (elencato nelle sezioni 3 e 5 sopra) è stato lasciato a una decisione
futura perché richiede una scelta di design o tocca più file insieme.

## 10. Sessione 2026-07-30 — Admin SDK per lo snapshot pubblico + fasce orarie cron

Obiettivo: preparare `generate-public-snapshot.mjs` all'attivazione (non
ancora fatta) di Firebase App Check in modalità enforcement, e ridurre le
letture Firestore non necessarie dello stesso script. Due modifiche
indipendenti, due commit separati su `main`, pushati:

- **`056d957`** — `generate-public-snapshot.mjs` migrato da client SDK
  (`firebase/firestore`) ad Admin SDK (`firebase-admin`), stesso pattern di
  inizializzazione di `set-shared-password.mjs`
  (`GOOGLE_APPLICATION_CREDENTIALS` + `applicationDefault()`). Motivo: con
  App Check in enforcement, un client SDK headless in CI non può fornire un
  token App Check valido e le sue letture verrebbero bloccate; l'Admin SDK
  bypassa App Check nativamente. La query e i campi esposti
  (`campiPubblici()`) sono invariati — solo l'SDK di lettura è cambiato.
- **`d2145ad`** — aggiunto `scripts/lib/finestraPubblicazione.mjs`: decide
  se l'invocazione corrente deve pubblicare, in base alla fascia oraria
  locale di Roma (calcolata via `Intl.DateTimeFormat`, DST-aware senza
  manutenzione manuale ai cambi CET/CEST): mai 23:00–11:00, ogni ora
  11:00–17:00, ogni 30 min 17:00–22:30 (la mezz'ora 22:30–23:00, non
  coperta esplicitamente dalla spec originale, è trattata come "mai").
  Legge `generatoIl` dell'ultimo snapshot già pubblicato su `public-data`
  per decidere se è passato abbastanza tempo — nessuno stato nuovo
  introdotto. Il cron di `public-snapshot.yml` è stato allargato a
  `*/30 7-22 * * *` UTC (finestra con margine per coprire 11:00–22:30 di
  Roma sia in CET sia in CEST); la decisione precisa resta nello script,
  eseguita **prima** di toccare credenziali o Firestore, cosicché la
  maggior parte delle invocazioni (fuori fascia) non consumi quota di
  lettura. Se lo script decide di non pubblicare, non genera il file di
  output e lo step di pubblicazione del workflow lo rileva e si ferma
  senza toccare git/branch `public-data`.

**Nuovo GitHub Secret introdotto**: `FIREBASE_SNAPSHOT_ADMIN_KEY` — vedi
sezione 8 per il dettaglio, sezione 6 per lo stato pending della verifica.

**Verificato in CI (2026-07-30)**: due run manuali (`workflow_dispatch`) di
`public-snapshot.yml`.
1. Durante la fascia notturna di Roma: terminato con successo mostrando
   `Nessuna pubblicazione: fuori fascia di pubblicazione (23:00–11:00 ora
   di Roma)` — conferma che la logica delle fasce funziona e che lo script
   esce prima di toccare credenziali/Firestore.
2. Alle 11:07 ora di Roma (appena entrati nella fascia 11:00–17:00):
   `Pubblico nuovo snapshot: ultimo snapshot 68 min fa (minimo richiesto in
   questa fascia: 60 min)` → `Scritto ...: 108 boulder/vie attivi.` →
   commit reale su `public-data` con `generatoIl:
   2026-07-30T09:07:46.687Z`. Conferma **end-to-end**: secret
   `FIREBASE_SNAPSHOT_ADMIN_KEY`, Admin SDK, lettura Firestore e
   pubblicazione funzionano tutti insieme. Percorso Admin SDK verificato
   completo, nessun pending residuo su questo fronte.

**Scoperto durante questa sessione e risolto in un terzo commit** (fuori
scope originale, ma stesso rischio App Check): `backup-firestore.mjs` usava
ancora il client SDK e si sarebbe rotto silenziosamente allo stesso modo
quando App Check fosse passato in enforcement. Migrato in `113745d` allo
stesso pattern Admin SDK, riusando il secret `FIREBASE_SNAPSHOT_ADMIN_KEY`
già verificato per lo snapshot pubblico (nessun nuovo secret creato). Non
ha bisogno di fasce orarie (è già un cron giornaliero singolo). **Verificato
con un run reale** (`workflow_dispatch`, 2026-07-30): `Scritto
/tmp/backup.json: 113 boulder, 117 storico, 6 tracciatori.`, release
GitHub pubblicata correttamente. Tutto lo scope di questa sessione è ora
verificato end-to-end; unico passo residuo il flip manuale di App Check
(sezione 6).

**Tentativo di flip App Check e scoperta imprevista**: prima di attivare
l'enforcement, il dialog "Enforce App Check" in Firebase Console ha
mostrato un avviso: **il 33% delle richieste dall'app registrata
`tracciatura-web`** (l'app client reale, non gli script CI) **non aveva un
token App Check valido**. Causa identificata: reCAPTCHA v3 è vincolato a
domini autorizzati, e con due host paralleli (GitHub Pages + Firebase
Hosting) è probabile che uno dei due domini non fosse autorizzato sulla
site key — flip rimandato per non rompere un terzo delle richieste reali.

**Quarto commit, `75478ba`** — invece di aggiungere il dominio GitHub
Pages a reCAPTCHA, l'utente ha deciso di dismettere GitHub Pages del
tutto (era comunque previsto in chiusura): "Unpublish" manuale in
Settings → Pages, poi rimossi da `deploy.yml` i job/permessi dedicati
(`pages: write`, `id-token: write`, `actions/upload-pages-artifact`,
`actions/deploy-pages`) — resta un solo job `deploy` che builda una volta
sola e pubblica su Firebase Hosting (`climbing-free`), invece dei 3 job
precedenti con build duplicata. Aggiornati anche `README.md` (step setup
Firebase Hosting invece di GitHub Pages) e il commento in
`vite.config.js`. Vedi sezione 1 per lo stato hosting aggiornato.

**Flip App Check eseguito e verificato (2026-07-30, stesso giorno)**: non
si è aspettato che la metrica "outdated requests" si stabilizzasse (era
scesa da 33% a 29%, ma su un campione di soli 10 minuti, non indicativo) —
dato che l'app è ancora in sviluppo e nessun utente reale la usava al
momento, si è scelto di attivare l'enforcement direttamente e verificare
con un test reale invece che aspettare. Esito: app funzionante
normalmente da `climbing-free.web.app` (login, navigazione, CRUD),
`backup-firestore.yml` rilanciato manualmente e terminato con successo
(tutti gli step verdi, inclusa la lettura Firestore via Admin SDK).
**Unico residuo**: `public-snapshot.yml` non ancora riverificato con
enforcement attivo — il tentativo di rilancio è uscito subito per "fuori
fascia oraria" (23:00–11:00 Roma) senza toccare Firestore, quindi non ha
provato nulla. Andrebbe rilanciato durante una fascia attiva
(11:00–22:30 ora di Roma) per una conferma diretta, anche se il rischio è
considerato basso (stesso pattern Admin SDK già verificato su
`backup-firestore.mjs`).

**Non toccato in questa sessione** (vincolo esplicito): `firestore.rules`.

## 11. Sessione 2026-07-31 — Vie permanenti "Fissa" + data effettiva pre-apertura stagione

Due feature indipendenti su richiesta esplicita, due commit separati su
`main`, pushati e deployati (deploy Firebase Hosting #43, `climbing-free`
verificato live senza errori console dopo il push):

- **`6335216`** — **Vie permanenti "Fissa"**: nuovo campo
  `boulder.permanente` (bool, default `false`, nessuna migrazione — assente/
  `false` su tutti i documenti esistenti copre il default). Impostazione
  riservata a una nuova sezione admin-only, `VieFisse.jsx` (route
  `/vie-fisse`, link "📌 Vie fisse" da `Profilo.jsx`, non in bottom nav —
  stessa guardia `isAdmin` e stesso pattern di link testuale di
  `SottoCestino.jsx`/"🛡️ Recupero admin"). Nessuna logica di creazione
  duplicata: `VieFisse.jsx` monta `BoulderForm` in modalità `create` con la
  nuova prop `permanenteDefault`, che mostra un toggle aggiuntivo SOLO in
  quel contesto (invisibile nei flussi normali `SettoreDetail`/
  `TuttiBoulder`, prop non passata lì). Badge "· fissa" in `BoulderRow.jsx`
  (stesso pattern inline già usato per "· old", nessun badge/pill
  separato per non rischiare la riga stretta), propagato anche alla vista
  pubblica aggiungendo `permanente` ai campi esportati in
  `campiPubblici()` (`generate-public-snapshot.mjs`) — comparirà nello
  snapshot pubblico al prossimo run del cron già attivo, nessuna azione
  manuale. **Statistiche.jsx non modificato**: le vie permanenti contano
  sempre nei totali/grafici per grado/settore come un boulder/via normale
  attivo, nessun filtro `permanente` aggiunto da nessuna parte (vincolo
  esplicito). Nessuna modifica a `firestore.rules`/`firestore.indexes.json`
  necessaria: `permanente` è un campo dato in più su un documento già
  scrivibile secondo le Rules esistenti (nessun `hasOnly()` su `boulder`),
  e nessuna nuova combinazione filtro+`orderBy` è stata introdotta
  (Statistiche filtra `permanente` solo in JS dopo il fetch).

- **`be37b2a`** — **Data effettiva automatica di pre-apertura stagione**:
  la palestra apre ufficialmente al pubblico il **1 settembre 2026**, ma i
  tracciatori tracciano vie già durante agosto 2026 (pre-apertura). Nuova
  `dataEffettiva(ora = new Date())` in `lib/date.js`: calcola "oggi" nel
  fuso Europe/Rome (DST-aware, via `Intl.DateTimeFormat`, stesso approccio
  già usato in `scripts/lib/finestraPubblicazione.mjs`) e restituisce
  insieme (per non avere due sorgenti di verità sulla stessa decisione) sia
  il Timestamp sia la stringa ISO da scrivere: se "oggi" precede il 1
  settembre 2026, un Timestamp esplicito per quella data + la stringa fissa
  `'2026-09-01'` (invece di `serverTimestamp()`, che qui non potrebbe
  forzare una data specifica); altrimenti `serverTimestamp()` reale + la
  data odierna reale. Il parametro opzionale `ora` esiste solo per poterla
  testare passando date finte (nessuna suite di test nel repo — verificato
  con uno script Node isolato e temporaneo, non committato, coprendo agosto
  2026, 1/2 settembre 2026 e il caso limite DST a cavallo della mezzanotte
  CEST/Roma). Integrata in `BoulderForm.jsx` (sia creazione sia modifica)
  per `boulder.creatoIl`/`dataUltimoCambio` e `storico.creatoIl`/
  `dataEvento` (solo in creazione per lo storico, invariato): il
  meccanismo sostituisce silenziosamente il valore scritto, ignorando
  quanto scelto nel selettore data del form, finché si è in pre-apertura —
  nessun input libero o indicatore visivo aggiunto (vincolo esplicito).
  **Eccezione esplicita**: i boulder con `permanente: true` (sopra)
  bypassano sempre questa logica, restano sulla data reale scelta
  dall'utente. Nessuno script di migrazione: si applica solo a nuove
  scritture da questo momento in poi, dati esistenti invariati.

**Non toccato in questa sessione**: `firestore.rules`,
`firestore.indexes.json` (nessuna delle due modifiche li richiedeva, vedi
sopra).

## 12. Sessione 2026-08-12 — Restrizione admin sul ciclo di vita delle vie fisse

La sessione 2026-07-31 (sezione 11) aveva introdotto `boulder.permanente` e il
flusso di creazione admin-only (`VieFisse.jsx`), ma il ciclo di cancellazione/
ripristino restava aperto a chiunque avesse la password condivisa: chiunque
poteva rimuovere, ripristinare o mandare in sotto-cestino una via fissa.
Questa sessione chiude il gap. Commit `b84eb26`, **pushato su `main`**
(confermato 2026-08-23).

- **`firestore.rules`**: nuova funzione `eBloccoPermanente()` (vera se il
  documento già è `permanente: true` OPPURE la scrittura lo sta impostando,
  per non lasciare un bypass "imposta permanente e rimuovi nella stessa
  scrittura"). `update` su `boulder`: se in gioco una via fissa, richiede
  `isAdmin()` per cambiare `stato` o `inSottocestino` (un non-admin può
  ancora correggere grado/colore/tracciatore/note). `delete`: richiede
  `isAdmin()` se `permanente: true`, a prescindere da `inSottocestino`.
  `storico`: invariato, il `delete` era già `isAdmin()`-only.
- **`BoulderRow.jsx`**: nuova prop `isAdmin`; il pulsante 🗑️ compare solo se
  `!boulder.permanente || isAdmin`. Propagata da `SettoreDetail.jsx` e
  `TuttiBoulder.jsx` come `tracciatoreLoggato?.isAdmin`.
- **`Cestino.jsx`**: aggiunto badge "· fissa" (mancava, la riga è resa
  duplicando la logica invece di riusare `BoulderRow`, vedi sezione 5);
  "Ripristina"/"Elimina" nascosti (non solo disabilitati) sulle righe fisse
  per i non-admin.
- **`SottoCestino.jsx`**: aggiunto solo il badge "· fissa" (mancava). Nessuna
  modifica di permessi: l'intera pagina è già admin-only (guard esistente),
  quindi "Ripristina"/"Elimina per sempre" erano già di fatto riservati agli
  admin.
- **`firestore.indexes.json`**: nessuna modifica — nessun nuovo filtro/
  `orderBy` su `permanente` introdotto da questa sessione.
- **Verificato**: `npm run build` pulito (stessi warning dimensione bundle di
  sempre); vista pubblica (`/pubblico`) caricata senza errori console.
  **Non verificato** con login reale autenticato (nessuna credenziale
  disponibile in questa sessione) — da testare manualmente con un account
  admin e uno non-admin prima del deploy.
- **Gap noti lasciati aperti deliberatamente** (fuori scope di questa
  sessione, vedi anche sezione 5): (1) `create` con `permanente: true` non è
  vincolato a `isAdmin()` nelle Rules, resta solo convenzione UI via
  `VieFisse.jsx` — stesso pattern del bug noto su `inSottocestino`; (2) il
  purge automatico 7gg di `Cestino.jsx` non ha guardia admin (per istruzione
  esplicita, rischio considerato accettabile): se una via fissa rimossa da un
  admin restasse >7gg lì e il purge girasse su una sessione non-admin, il
  batch di cancellazione fallirebbe per intero a causa delle nuove Rules
  (scenario teorico, non osservato).

## 13. Sessione 2026-08-23 — Wipe totale dati di test pre-apertura

Obiettivo: tutti i boulder/vie e lo storico creati fino ad oggi erano dati di
test da rodaggio interno (incluse le vie "Fisse" impostate finora, non
considerate reali). Con l'apertura al pubblico ormai vicina, cancellazione
completa per ripartire da zero da domani. **Nessuna modifica di codice**:
solo un'operazione una tantum sui dati Firestore più la rigenerazione dello
snapshot pubblico.

- **Verifica pre-cancellazione**: confermato un backup recente e valido —
  Release GitHub `backup-2026-08-23` (le release di `backup-firestore.yml`
  sono generate automaticamente ogni notte, retention 30gg — vedi sezione 8),
  generata alle 03:56 UTC dello stesso giorno, 120 boulder + 128 storico + 6
  tracciatori, JSON non vuoto scaricato e ispezionato prima di procedere.
- **Script one-off** `scripts/wipe-dati-test.mjs` (Admin SDK, stesso pattern
  dry-run/`--write` di `migrate-tipo.mjs`/`rename-gabriele-to-masa.mjs`):
  dry-run mostrato e confermato esplicitamente da Gabriele in chat prima di
  qualunque scrittura, poi cancellazione reale a batch (limite 500/batch)
  delle collezioni `boulder` (120/120, incluse le vie con `permanente: true`,
  `stato: 'rimossa'` e `inSottocestino: true`, nessuna eccezione) e `storico`
  (128/128). **Non toccate**: `tracciatori`, `tracciatoriByUid`,
  `config/authGate`, `unlockAttempts`, `loginAttempts` (fuori scope per
  istruzione esplicita). **Script rimosso subito dopo l'uso** (mai
  committato, quindi nessuna traccia in git) — non pensato per essere
  rieseguibile senza rischio, stesso criterio già applicato agli script
  temporanei di deploy dismessi.
- **Snapshot pubblico rigenerato manualmente fuori dal cron**: il normale
  `generate-public-snapshot.mjs` si è rifiutato di pubblicare
  (`fuori fascia di pubblicazione, 23:00–11:00 ora di Roma` — vedi
  `scripts/lib/finestraPubblicazione.mjs`, sezione 8), quindi per questa
  sessione la query Firestore + scrittura del JSON sono state eseguite ad hoc
  (stessa logica/`campiPubblici()` dello script, nessuna modifica al file
  committato) e pubblicate a mano sul branch `public-data` (commit
  `a00ae2d`, `{"boulder":[]}`) tramite un git worktree separato, per non
  aspettare il prossimo giro di cron con la vista pubblica ancora popolata
  dai vecchi dati di test.
- **Verificato**: vista pubblica (`climbing-free.web.app/#/pubblico` →
  "Tutti i boulder e le vie") mostra "Nessun boulder tracciato ancora.".
  Area autenticata **non verificata visivamente** (nessuna credenziale della
  password condivisa disponibile in questa sessione) — confermata vuota solo
  a livello dati (conteggio Firestore 0/0 dopo il wipe, via lo stesso script
  Admin SDK). Da confermare visivamente da Gabriele con login reale.
- **Nessuna modifica a `main`**: lo script era solo locale/mai committato,
  quindi nessun push/deploy necessario per questa sessione — l'unica scrittura
  remota è il commit su `public-data` sopra.
- **Nota per il futuro**: da qui in avanti ogni nuovo boulder/via reale
  continua a essere normalizzato alla data `2026-09-01` finché la data reale
  non supera quella soglia (comportamento invariato, sezione 11); le uniche
  vie con data reale immediata saranno le nuove "Fisse" impostate da questo
  momento in poi.
