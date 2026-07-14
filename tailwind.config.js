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
        // Palette scura della Home a scelta Boulder/Corda
        grafite: '#16140F',
        grafiteAlzata: '#1E1B15',
        gesso: '#F2EDE4',
        pietra: '#8A8478',
      },
      fontFamily: {
        archivo: ['"Archivo Black"', 'sans-serif'],
        barlow: ['"Barlow Condensed"', 'sans-serif'],
        worksans: ['"Work Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
