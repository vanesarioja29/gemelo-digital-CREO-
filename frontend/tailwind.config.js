/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'creo-vino': '#AA0831',
        'creo-naranja': '#FBB000',
        'creo-verde': '#2E8B57',
        'creo-gris': '#6E6E6E',
      }
    },
  },
  plugins: [],
}
