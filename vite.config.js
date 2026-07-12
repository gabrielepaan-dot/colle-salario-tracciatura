import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Il repo si chiama "colle-salario-tracciatura": GitHub Pages serve il sito
// da https://<utente>.github.io/colle-salario-tracciatura/, quindi Vite deve
// sapere che l'app NON vive alla root del dominio.
export default defineConfig({
  plugins: [react()],
  base: '/colle-salario-tracciatura/',
})
