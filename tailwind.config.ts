import type { Config } from 'tailwindcss';

// Tema camaleónico: los colores se leen de variables CSS inyectadas en runtime.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        surface: 'var(--color-surface)',
        'text-dynamic': 'var(--color-text-dynamic)',
      },
    },
  },
  plugins: [],
};

export default config;
