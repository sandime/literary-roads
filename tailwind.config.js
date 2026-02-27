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
      },
      fontFamily: {
        'bungee': ['Bungee', 'cursive'],
        'special-elite': ['Special Elite', 'monospace'],
        'atomic': ['Atomic Age', 'cursive'],
      },
    },
  },
  plugins: [],
}
