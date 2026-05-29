/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sky-pilot': '#4A9FD4',
        'green-pilot': '#5A9E6B',
        'amber-pilot': '#F59E0B',
        'red-pilot': '#EF4444',
      },
      fontFamily: {
        lora: ['Lora', 'serif'],
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
