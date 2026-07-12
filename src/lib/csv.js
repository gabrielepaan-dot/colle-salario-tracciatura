// Genera un CSV da un array di oggetti e lo scarica nel browser.
// headers: [{ key: 'campo', label: 'Etichetta colonna' }, ...]
export function scaricaCsv(nomeFile, headers, righe) {
  const escape = (valore) => {
    if (valore === null || valore === undefined) return ''
    const s = String(valore)
    // Se contiene virgola, virgolette o a-capo, va racchiuso tra virgolette
    // (e le virgolette interne raddoppiate) per compatibilità Excel/Sheets.
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const intestazione = headers.map((h) => escape(h.label)).join(',')
  const righeCsv = righe.map((riga) => headers.map((h) => escape(riga[h.key])).join(','))

  // BOM iniziale (\uFEFF): senza, Excel su Windows a volte interpreta male gli accenti.
  const contenuto = '\uFEFF' + [intestazione, ...righeCsv].join('\n')

  const blob = new Blob([contenuto], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeFile
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
