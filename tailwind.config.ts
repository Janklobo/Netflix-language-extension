import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        butter: {
          50: '#FAF7EE',
          100: '#F4EFE0',
          200: '#E8E2D3',
          300: '#D9D0BE',
        },
        burnt: {
          DEFAULT: '#E13D18',
          hover: '#C73412',
          soft: '#FDEEE9',
        },
        espresso: '#1C1917',
        stonecustom: {
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
        },
        brand: {
          orange: '#E13D18',
          orangeDark: '#C23211',
          honey: '#FEF3C7',
          honeyText: '#B45309',
          slateText: '#57534E',
          charcoal: '#1C1917',
          ivory: '#FFFDF8',
          cardBorder: '#E8E2D3',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Newsreader"', 'Georgia', 'serif'],
        display: ['"Newsreader"', 'Georgia', 'serif'],
        outfit: ['"Outfit"', 'sans-serif'],
        inter: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
