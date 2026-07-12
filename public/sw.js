// Service worker "no-op": esiste solo perché Chrome richiede un service
// worker registrato con un handler "fetch" per considerare l'app
// installabile e mostrare il prompt "Installa app". Non fa nessuna cache
// né gestisce l'offline — scelta deliberata, la modalità offline è stata
// esplicitamente esclusa dai requisiti della v1 (serve sempre connessione).
self.addEventListener('fetch', () => {
  // Nessuna intercettazione: ogni richiesta passa direttamente alla rete,
  // come se il service worker non ci fosse.
})
