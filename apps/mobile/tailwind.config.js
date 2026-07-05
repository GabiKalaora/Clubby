/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#a855f7',
          light:   '#c084fc',
          dark:    '#9333ea',
        },
        secondary: {
          DEFAULT: '#ec4899',
          light:   '#f472b6',
          dark:    '#db2777',
        },
        background: '#f8f9fa',
        surface: {
          DEFAULT: '#ffffff',
          dark:    '#f1f5f9',
        },
        foreground: '#2d3748',
        muted:      '#64748b',
        border: {
          DEFAULT: '#e2e8f0',
          subtle:  '#b997fa33',
        },
        sidebar: {
          DEFAULT: '#2d2640',
          alt:     '#352f4a',
        },
        success: '#10b981',
        danger:  '#ef4444',
        warning: '#f59e0b',
        status: {
          error:       '#ef4444',
          errorTint:   '#ef444415',
          warning:     '#f59e0b',
          warningTint: '#f59e0b15',
          successTint: '#10b98115',
        },
      },
      fontFamily: {
        sans:   ['PlusJakartaSans_400Regular', 'System'],
        medium: ['PlusJakartaSans_500Medium',  'System'],
        semi:   ['PlusJakartaSans_600SemiBold','System'],
        bold:   ['PlusJakartaSans_700Bold',    'System'],
        black:  ['PlusJakartaSans_800ExtraBold','System'],
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
