const { createCrewLabTheme, crewLabContainer } = require('../tailwind.design');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: crewLabContainer,
    extend: createCrewLabTheme(),
  },
  plugins: [require('tailwindcss-animate')],
};
