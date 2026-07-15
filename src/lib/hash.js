// SHA-256 esadecimale (minuscolo) via Web Crypto, usato per dimostrare la
// conoscenza della password condivisa senza mai inviarla o salvarla in
// chiaro (vedi passwordSbloccata() in firestore.rules). L'hash calcolato
// qui deve combaciare byte per byte con quello prodotto da
// scripts/set-shared-password.mjs (stesso algoritmo, stessa codifica hex).
export async function sha256Hex(testo) {
  const bytes = new TextEncoder().encode(testo)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
