import type { Config } from 'tailwindcss';

const config: Config = {
  // Only scan popup and options pages — content scripts use hand-written CSS
  // to avoid Tailwind's reset stylesheet leaking into Netflix's styles.
  content: [
    './src/popup/**/*.{ts,tsx}',
    './src/options/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // LinguaFlix brand palette derived from Tailwind indigo
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      fontFamily: {
        // System font stack — no font downloads in an extension
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
