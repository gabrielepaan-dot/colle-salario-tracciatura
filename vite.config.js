import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base relativa: l'app viene pubblicata sia su GitHub Pages (sotto un
// sottopercorso, /colle-salario-tracciatura/) sia su Firebase Hosting (alla
// radice del dominio, es. climbing-free.web.app/). Con base relativo lo
// stesso build funziona identico su entrambi.
export default defineConfig({
  plugins: [react()],
  base: './',
})
