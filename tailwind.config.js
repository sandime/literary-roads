/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Googie Color Palette
        'midnight-navy': '#1A1B2E',
        'starlight-turquoise': '#40E0D0',
        'atomic-orange': '#FF4E00',
        'paper-white': '#F5F5DC',
        'chrome-silver': '#C0C0C0',
        // Gazette Color Palette
        'gaz-cream':      '#f5f1eb',
        'gaz-cream-dk':   '#ede7dc',
        'gaz-ink':        '#1c2b2d',
        'gaz-ink-light':  '#3a4f52',
        'gaz-teal-dark':  '#2d6d74',
        'gaz-coral':      '#e8956b',
      },
      fontFamily: {
        'bungee': ['Bungee', 'cursive'],
        'special-elite': ['Special Elite', 'monospace'],
      },
    },
  },
  plugins: [],
}
