import { useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const THEME_KEY = '@clubby_theme'
export type ThemePreference = 'auto' | 'light' | 'dark'

/**
 * Clubby design tokens — Instagram-inspired visual language.
 * Clean surfaces, near-black type, brand gradient used sparingly as accent.
 */
export const brand = {
  gradient: ['#ec4899', '#a855f7'] as [string, string],
  // Story-ring gradient (Instagram-style warm→brand sweep)
  storyRing: ['#f59e0b', '#ec4899', '#a855f7'] as [string, string, string],
  purple: '#a855f7',
  pink: '#ec4899',
}

export type ThemeColors = {
  background: string
  surface: string
  surfaceAlt: string
  border: string
  text: string
  textSecondary: string
  textMuted: string
  accent: string
  danger: string
  success: string
  overlay: string
}

export const lightColors: ThemeColors = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f8f9fb',
  border: '#e5e7eb',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: brand.purple,
  danger: '#ef4444',
  success: '#22c55e',
  overlay: 'rgba(0,0,0,0.45)',
}

export const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#0b0b0f',
  surfaceAlt: '#16161c',
  border: '#26262e',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  accent: '#c084fc',
  danger: '#f87171',
  success: '#4ade80',
  overlay: 'rgba(0,0,0,0.6)',
}

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
}

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
}

export function useTheme() {
  const systemScheme = useColorScheme()
  const [preference, setPreference] = useState<ThemePreference>('auto')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved) setPreference(saved as ThemePreference)
    })
  }, [])

  const isDark = preference === 'dark' || (preference === 'auto' && systemScheme === 'dark')
  return { isDark, colors: isDark ? darkColors : lightColors, preference }
}
