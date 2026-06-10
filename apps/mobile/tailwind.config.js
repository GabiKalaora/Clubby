/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a7a4a',   // deep rich green
          light:   '#22a05f',   // mid green for hover/active
          bright:  '#2ecc71',   // bright accent (kept for highlights)
          dark:    '#145e38',   // darkest green for pressed states
          muted:   '#0f3d25',   // very dark green for bg tints
        },
        surface: {
          DEFAULT: '#151617',   // near-black bg (from reference)
          card:    '#1e2022',   // card background
          sheet:   '#ffffff',   // white bottom sheet
          border:  '#2a2d2f',   // subtle border
        },
        text: {
          primary:   '#ffffff',
          secondary: '#8e969f',
          muted:     '#4a5260',
        },
        danger: '#f87171',
        success: '#1a7a4a',
      },
      fontFamily: {
        sans:  ['Urbanist_400Regular', 'System'],
        medium:['Urbanist_500Medium',  'System'],
        semi:  ['Urbanist_600SemiBold','System'],
        bold:  ['Urbanist_700Bold',    'System'],
        black: ['Urbanist_800ExtraBold','System'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
