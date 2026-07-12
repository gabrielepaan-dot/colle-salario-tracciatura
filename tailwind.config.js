/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Colori del brand A.S.D. Colle Salario, riusati in tutta l'app
        // (header, bottom nav, bottoni primari, badge)
        navy: '#0c1445',
        giallo: '#FFC72C',
        verde: '#1E9E5A',
        rosso: '#E8202A',
      },
    },
  },
  plugins: [],
}
