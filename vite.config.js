import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base relativa: storicamente serviva per funzionare sia su GitHub Pages
// (sottopercorso) sia su Firebase Hosting (radice) — GitHub Pages dismesso
// dal 2026-07-30, ma la base relativa resta corretta anche a radice
// singola, nessun motivo per cambiarla.
export default defineConfig({
  plugins: [react()],
  base: './',
})
