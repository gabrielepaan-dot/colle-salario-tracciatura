# Audit pre-apertura pubblica — Tracciatura Boulder (A.S.D. Colle Salario)

> Solo analisi, nessuna modifica applicata al codice. Riferimenti a `file:riga`
> relativi allo stato del branch `main` al momento dell'audit (2026-07-17).
> Dove utile mi sono appoggiato anche a `PROJECT_STATE.md` (non tracciato in
> git, ma presente in working tree) che documenta già alcune delle
> limitazioni confermate qui in modo indipendente.

---

## 1. Sicurezza

### Critico

**1.1 — Il rate limiting sul gate password non è imposto dalle Rules, solo "onorato" dal client**
`firestore.rules:36-48`, `src/lib/useAuth.js:109-170`

L'incremento del contatore `loginAttempts/{uid}` avviene **solo** nel codice
client (`registraFallimento`, `useAuth.js:109`), invocato quando l'app
intercetta un errore `permission-denied` sulla scrittura di
`unlockAttempts/{uid}`. Le Rules su `unlockAttempts` (righe 43-47) però non
richiedono affatto che un fallimento sia stato registrato per poter
ritentare: la condizione è solo `!bloccatoPerRateLimit(uid)` (vera finché
`loginAttempts/{uid}` non esiste) più l'hash corretto. Chiunque interroghi
Firestore direttamente (console del browser, script con l'SDK client,
usando la config Firebase pubblica nel bundle) può ripetere all'infinito
tentativi di scrittura su `unlockAttempts/{uid}` con hash diversi **senza mai
scrivere `loginAttempts`**, ottenendo un bruteforce di fatto illimitato sulla
password condivisa — con lo stesso uid, senza nemmeno bisogno del
logout/nuovo-uid descritto nei commenti (righe 69-70) come "unico bypass
noto". Quel bypass documentato è in realtà secondario rispetto a questo.

Impatto: il repo è pubblico e la config Firebase (apiKey, projectId) è per
design nel bundle JS (`src/lib/firebase.js:21-23`, commento esplicito "questi
valori sono pensati per essere pubblici"). Un bruteforce automatizzato è
alla portata di chiunque sappia aprire devtools, senza alcun argine reale
lato server. Vedi anche 1.2 e 1.4 per l'effetto a catena.

**1.2 — Nessuna revoca reale della password condivisa**
`scripts/set-shared-password.mjs:32-36`, `firestore.rules:20-23`

`unlockAttempts/{uid}` resta valido a tempo indefinito finché quel device
non fa logout esplicito, **anche dopo** che un admin ruota la password
condivisa (comportamento esplicitamente documentato nel commento dello
script di rotazione). Combinato con 1.1: se la password viene mai
indovinata o diffusa, ruotarla non chiude la finestra di esposizione per chi
l'ha già ottenuta — quell'uid continua a poter scrivere `boulder`/`storico`/
`tracciatoriByUid` indefinitamente. L'unico modo per revocare un device è la
cancellazione manuale del suo documento da Firestore Console; non esiste
nessuna UI né automazione per farlo.

Impatto: alto in vista dell'apertura pubblica — un'eventuale fuga della
password (indovinata via 1.1, o condivisa a voce/screenshot da un
tracciatore) non è rimediabile con una semplice rotazione.

**1.3 — Nessuna validazione di schema/identità su `boulder` e `storico`**
`firestore.rules:139-169`, `src/components/BoulderForm.jsx:145-186,195-211`

A differenza di `unlockAttempts` e `loginAttempts` (che vincolano
`keys().hasOnly([...])` e i valori ammessi), le regole di create/update su
`boulder` e `storico` richiedono solo `passwordSbloccata()`, senza alcun
vincolo su quali campi/valori possano essere scritti. Un client (anche solo
con l'SDK, non necessariamente passando dall'app) può quindi scrivere
`tracciatoreId`/`tracciatoreNome`/`eseguitoDaUid`/`eseguitoDaNome` con
qualunque valore, senza che siano legati all'identità realmente
autenticata — in `BoulderForm.jsx` questi campi sono presi da semplice stato
React scelto dall'utente (righe 149-152, 175-178), non verificati dalle
Rules contro `request.auth.uid`.

Impatto: chiunque conosca la password condivisa (cioè, per progetto, ogni
tracciatore) può intestare falsamente un'azione a un altro tracciatore
nello storico che alimenta classifica pubblica e CSV. Non è uno sconosciuto
da internet (serve comunque la password), ma con l'apertura pubblica la
"fiducia reciproca tra tracciatori" come unico argine diventa un'assunzione
più fragile, e le Rules non impongono nulla in merito.

### Medio

**1.4 — Lettura pubblica diretta di Firestore, non solo tramite lo snapshot**
`firestore.rules:112,126,140,163`

`tracciatori`, `tracciatoriByUid`, `boulder` e `storico` hanno tutti `allow
read: if true`. È una scelta di design (i dati sono pensati come pubblici),
ma significa che chiunque può interrogare Firestore direttamente con query
arbitrarie — non solo leggere il JSON statico — senza alcun limite lato
Rules. Sul piano Spark (nessuna fatturazione, tetto giornaliero fisso sulle
letture) questo è un vettore concreto di esaurimento quota, aggravato da
1.1 (ogni tentativo di bruteforce consuma internamente almeno una lettura
`get()` nelle Rules). Esaurire la quota blocca **l'intera app per tutti**,
incluso il login (la stessa lista `tracciatori` è dietro `read: true`),
finché la quota non si resetta il giorno dopo.

Impatto: realistico — non serve un attacco mirato, basta un crawler/bot
generico o un singolo script lasciato in loop per errore.

**1.5 — `inSottocestino` può essere impostato da un non-admin anche fuori dal flusso previsto**
`firestore.rules:147-148`

La regola blocca modifiche a un boulder **già** `inSottocestino: true` da
parte di non-admin, ma non impedisce di per sé a un non-admin di impostare
`inSottocestino: true` per la prima volta anche su un boulder `attiva` (non
ancora passato da `stato: 'rimossa'` via Cestino), bypassando il percorso
previsto (Cestino → sotto-cestino solo da `rimossa`, vedi commenti
`Cestino.jsx:14-20`). Non raggiungibile dalla UI normale, richiede comunque
la password condivisa, e l'effetto pratico è limitato (nascondere un
blocco attivo nella pagina admin, recuperabile). Segnalato perché le Rules
da sole non riflettono l'invariante che il codice assume.

**1.6 — `tracciatoreNome` denormalizzato può essere azzerato per errore in modifica**
`src/components/BoulderForm.jsx:195-211`, `src/components/SettoreDetail.jsx:134`

Se un boulder è attribuito a un tracciatore poi rimosso da AdminPanel,
aprirlo in modifica e salvare **qualunque** cambiamento (anche solo una
nota) sovrascrive `tracciatoreNome` con stringa vuota:
`tracciatori.find(t => t.id === tracciatoreId)?.nome || ''` — la select
"Tracciatore" nel form (righe 470-493) elenca solo i tracciatori correnti,
non ha un'opzione per "tracciatore rimosso, mantieni il nome storico".
Diversamente dalla rimozione stessa (che, come documentato in
`AdminPanel.jsx` e `PROJECT_STATE.md`, non tocca i dati storici), qui è una
modifica *successiva* a rompere silenziosamente l'attribuzione.
Riproducibile: rimuovi un tracciatore → apri in modifica un suo vecchio
boulder → salva → il nome sparisce da quel boulder (e resterebbe "vuoto"
anche nella vista pubblica e in Statistiche).

**1.7 — Nessun `firestore.indexes.json` versionato**
Confermato anche in `PROJECT_STATE.md` §3/§5.

Gli indici compositi richiesti da `SettoreDetail.jsx:30-35` e
`TuttiBoulder.jsx:24-28` (equality su `settore`/`tipo` + `stato` + `orderBy
dataUltimoCambio`) esistono oggi solo perché creati manualmente in console.
Non essendo versionati: (a) non c'è modo di ricrearli automaticamente se il
progetto Firestore venisse ricreato o clonato per un ambiente di test; (b)
nessun controllo automatico verifica che ogni combinazione filtro+ordinamento
usata dal codice abbia davvero un indice — un nuovo filtro aggiunto in
futuro fallirebbe silenziosamente in produzione (errore Firestore visibile
solo in console) finché qualcuno non nota il problema e clicca il link.

**1.8 — Nessuna unicità reale sui nomi tracciatori**
`src/components/AdminPanel.jsx:36-50`

La verifica di duplicati è solo lato client, con una query prima
dell'insert. Due admin che aggiungono lo stesso nome quasi
contemporaneamente, o un nome identico a un tracciatore già rimosso, possono
creare doppioni — e, combinato con 1.6, mescolare silenziosamente lo
storico di due persone diverse: `Statistiche.jsx:113-124` raggruppa la
classifica esclusivamente per stringa `tracciatoreNome`, non per id.

### Minore

**1.9 — CSV formula injection nell'export**
`src/lib/csv.js:4-11`

L'escape del CSV gestisce virgole/virgolette/a-capo ma non neutralizza un
primo carattere `=`, `+`, `-`, `@`, che Excel/Sheets interpretano come
inizio formula. Il campo libero "note" (scrivibile da qualunque tracciatore
con la password, vedi `BoulderForm.jsx:56,161,183,207`) finisce
nell'export CSV usato dall'admin (`ExportCsv.jsx`). Rischio basso — richiede
comunque un "insider" con la password condivisa, non uno sconosciuto — ma è
un vettore classico se qualcuno scrivesse una nota tipo
`=HYPERLINK("http://...","clicca")`.

**1.10 — Messaggio UI fuorviante sul Cestino normale**
`src/components/Cestino.jsx:206-207`

Il dialog di conferma per "Elimina" nel Cestino normale dice "verrà rimosso
... e non potrà essere recuperato", ma di fatto l'azione sposta il blocco
nel sotto-cestino, da cui un admin **può** ripristinarlo
(`SottoCestino.jsx:71-86`). Non è un problema di sicurezza, solo un
disallineamento tra messaggio mostrato al tracciatore normale e
comportamento reale.

### Verificato, nessun problema trovato
- Nessun uso di `dangerouslySetInnerHTML`/`innerHTML`/`eval` in tutto `src/`:
  il campo "note" è renderizzato solo tramite JSX (auto-escaping React) o
  finisce nel CSV — nessun percorso XSS individuato.
- La vista pubblica (`/pubblico`, `PubblicoTuttiBoulder.jsx`,
  `PubblicoSettoreDetail.jsx`, `pubblicoSnapshot.js`) non tocca mai
  Firestore: legge solo il JSON statico da `raw.githubusercontent.com`,
  coerente con quanto dichiarato nei commenti.
- Nessun segreto reale (service account key, `.env`, password) è mai stato
  committato nella storia git: ho verificato sia i file mai tracciati
  (`git log --all --name-only`) sia una ricerca full-history di pattern
  tipici (`BEGIN PRIVATE KEY`, `AIza...`) su tutti i 27 commit di tutti i
  branch — l'unico match è il placeholder `AIzaSyXXXX...` in
  `.env.example`. `serviceAccountKey.json` e `.env` non sono mai stati
  tracciati.

---

## 2. Coerenza dati e regressioni note

- **`storico` non viene mai toccato dalle update** — verificato:
  `BoulderForm.jsx` in modalità `update` (righe 195-212) esegue solo
  `batch.update` su `boulder`, mai una scrittura su `storico`, coerente col
  commento esplicito alle righe 187-190. `eliminaBoulder.js` (soft-delete)
  idem: tocca solo `boulder`. `storico` viene scritto solo in creazione
  (righe 170-185) e cancellato solo dall'hard-delete admin
  (`SottoCestino.jsx:30-36`). Nessun problema trovato qui.
- **`tracciatoreNome` denormalizzato assunto sempre aggiornato**: vedi 1.6 e
  1.8 sopra — il problema concreto è nella *modifica* di un boulder
  orfano (tracciatore rimosso), non nella rimozione in sé (quella è
  gestita e documentata correttamente).
- **Flusso Cestino "normale"**: verificato end-to-end
  (`useCancellazioneBoulder.js` + `Cestino.jsx` + `eliminaBoulder.js`) —
  soft-delete con toast "Annulla" di 4.5s, scrittura ritardata ma non persa
  se si naviga via (righe 26-35 di `useCancellazioneBoulder.js`), ripristino
  che azzera correttamente i metadati di rimozione, pulizia automatica dei
  blocchi rimossi da oltre 7 giorni ad ogni apertura pagina. Nessun problema
  trovato in questo flusso, a parte il messaggio fuorviante di 1.10.

---

## 3. Edge case e robustezza

- **Snapshot pubblico mancante/malformato/fetch fallito**: gestito
  (`pubblicoSnapshot.js:18-31`) con try/catch su fetch, `res.ok` e parsing
  JSON, con messaggio "Dati non disponibili al momento. Riprova tra poco." e
  pulsante "Riprova". Non degrada silenziosamente. Nessun problema.
- **`unlockAttempts` valido ma tracciatore cancellato nel frattempo**:
  verificato in `useAuth.js:35-48` — se `tracciatori/{tracciatoreId}` non
  esiste più, `tracciatore` viene impostato a `null`, e in `App.jsx:84-86`
  l'utente torna alla schermata "Chi sei?" (nessun crash, nessuno stato
  bloccato). Comportamento accettabile, anche se un po' brusco (l'utente
  perde il collegamento al proprio nome senza un messaggio esplicito che
  spieghi perché).
- **Race condition sulla creazione di boulder stesso colore/settore**: non
  esiste — ogni creazione usa `doc(collection(db,'boulder'))` con ID
  auto-generato (`BoulderForm.jsx:167`), quindi due creazioni simultanee non
  possono mai sovrascriversi a vicenda. Duplicati con stesso colore/settore
  sono comunque possibili (nessun vincolo di unicità), ma sembra
  intenzionale: il modello dati è "un documento per via/blocco fisico", e
  più vie dello stesso colore nello stesso settore sono normali in una
  palestra reale.
- **Race condition sulla *modifica* dello stesso boulder**: qui invece un
  rischio reale esiste. `BoulderForm.jsx` update (righe 200-211) fa un
  `batch.update` diretto, senza transazione né controllo di
  "ultima modifica letta vs corrente": se due tracciatori aprono in
  modifica lo stesso boulder quasi simultaneamente, l'ultimo che salva
  sovrascrive silenziosamente le modifiche dell'altro (classico
  lost-update), senza alcun avviso. Probabilità bassa in pratica (richiede
  due persone sullo stesso blocco nello stesso istante), ma non c'è nessuna
  protezione né segnalazione.
- **Indici Firestore compositi**: vedi 1.7 — esistono (altrimenti le query
  fallirebbero già oggi in produzione), ma non sono verificabili/riproducibili
  perché non versionati.

---

## 4. Qualità generale

- **`npm run build`**: completa con successo. **Aggiornamento 2026-07-23**:
  `Statistiche.jsx` (unica consumatrice di `recharts`) è ora caricata con
  `React.lazy`/`Suspense` (vedi `src/App.jsx`) — il bundle iniziale è sceso
  da un unico chunk da 1.14 MB (300 KB gzip) a un chunk principale da
  717 KB (184 KB gzip) più un chunk `Statistiche` separato da 425 KB
  (115 KB gzip) scaricato solo dietro click sulla tab Statistiche. I
  visitatori della vista pubblica non scaricano più `recharts`. Il chunk
  principale resta sopra la soglia di warning di Vite (500 kB): il residuo
  è dominato da `firebase` (auth + firestore), necessario fin dal primo
  caricamento per il gate di login — non ulteriormente separabile senza
  `manualChunks`, valutato non necessario per ora.
- **`console.log`/`console.error` di debug**: nessun `console.log`
  dimenticato in `src/` (verificato con ricerca su tutto l'albero). I
  `console.error` presenti sono tutti in blocchi `catch` come log d'errore
  intenzionale, pattern coerente in tutto il codice — non un problema.
- **`npm audit`**: 0 vulnerabilità note nelle dipendenze di produzione al
  momento dell'audit (da ripetere periodicamente, non è una garanzia
  permanente).
- **Nessuna suite di test/lint/type-check in CI**: confermato, anche in
  `PROJECT_STATE.md` §5 — `deploy.yml` verifica solo che `npm run build`
  non fallisca, nessun controllo sul comportamento.
- **`public-snapshot.yml` — fallimento silenzioso del cron**: se lo step
  "Genera public-snapshot.json" fallisce (es. quota Firestore esaurita —
  vedi 1.4/1.1 — errore di rete, rate limit di `raw.githubusercontent.com`),
  il job si interrompe e basta: nessuno step di notifica/alerting oltre
  l'email di default di GitHub Actions per i workflow schedulati falliti
  (facile da perdere o disabilitare). Inoltre il JSON generato contiene un
  campo `generatoIl` (timestamp di generazione,
  `generate-public-snapshot.mjs:59-61`) che però **non viene mai letto né
  mostrato** da nessun componente (`pubblicoSnapshot.js`,
  `PubblicoTuttiBoulder.jsx`, `PubblicoSettoreDetail.jsx` — verificato,
  nessun riferimento a `generatoIl` in tutto `src/`): quindi né i visitatori
  né gli admin hanno modo, dall'interno dell'app, di accorgersi che i dati
  pubblici sono stantii da ore o giorni se il cron smette di funzionare.
- **Nota GitHub Actions**: i workflow schedulati (`cron`) vengono
  automaticamente disabilitati da GitHub dopo 60 giorni senza alcuna
  attività (push) sul repository. Se il progetto dovesse attraversare un
  periodo di pausa prolungato, il cron di `public-snapshot.yml` si
  fermerebbe silenziosamente e richiederebbe una riattivazione manuale
  dalla tab Actions.
- **`deploy.yml`**: nessun problema rilevato oltre quanto sopra — build e
  pubblicazione via artifact GitHub Pages (non branch persistente), coerente
  con quanto documentato.

---

## Riepilogo per priorità

| # | Titolo | Sezione | Gravità |
|---|---|---|---|
| 1.1 | Rate limiting password bypassabile senza logout, bruteforce illimitato | Sicurezza | **Critico** |
| 1.2 | Rotazione password non revoca device già sbloccati | Sicurezza | **Critico** |
| 1.3 | Nessuna validazione schema/identità su boulder/storico | Sicurezza | **Critico** |
| 1.4 | Lettura pubblica diretta Firestore, rischio esaurimento quota Spark | Sicurezza | Medio |
| 1.5 | `inSottocestino` impostabile da non-admin fuori flusso previsto | Sicurezza | Medio |
| 1.6 | `tracciatoreNome` azzerato in modifica di boulder orfano | Sicurezza/Dati | Medio |
| 1.7 | Nessun `firestore.indexes.json` versionato | Sicurezza/Robustezza | Medio |
| 1.8 | Nessuna unicità reale nomi tracciatori | Sicurezza/Dati | Medio |
| 3.x | Lost-update in modifica concorrente stesso boulder | Robustezza | Medio |
| 4.x | Cron snapshot: fallimento silenzioso, nessuna staleness UI | Qualità | Medio |
| 1.9 | CSV formula injection su campo note | Sicurezza | Minore |
| 1.10 | Messaggio "irreversibile" fuorviante nel Cestino | Qualità | Minore |
| 4.x | ~~Bundle JS unico >1MB, nessun code-splitting~~ — risolto 2026-07-23 (Statistiche lazy-loaded) | Qualità | Minore |
