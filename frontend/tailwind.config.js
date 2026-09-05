/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'on-primary': '#ffffff',
        ink: '#000000',
        canvas: '#ffffff',
        'canvas-soft': '#efefef',
        'canvas-softer': '#f3f3f3',
        'surface-pressed': '#e2e2e2',
        surface: '#fcf9f8',
        'surface-dim': '#dcd9d9',
        'surface-bright': '#fcf9f8',
        'surface-container': '#f0edec',
        'surface-container-low': '#f6f3f2',
        'surface-container-high': '#ebe7e7',
        'surface-container-highest': '#e5e2e1',
        'black-elevated': '#282828',
        'body-muted': '#5e5e5e',
        body: '#5e5e5e',
        mute: '#afafaf',
        'hairline-mid': '#4b4b4b',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        transit: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Hanken Grotesk', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        pill: '999px',
        'pill-tab': '36px',
      },
      boxShadow: {
        'uber-dock': '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
        'uber-elevated': '0 12px 36px rgba(0, 0, 0, 0.18)',
      },
    },
  },
  plugins: [],
}
