import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

import en from '../locales/en.json'
import he from '../locales/he.json'

export const STORAGE_KEY = '@clubby_lang'
export const SUPPORTED_LANGS = ['en', 'he'] as const
export type SupportedLang = typeof SUPPORTED_LANGS[number]

export function isHebrew(): boolean {
  return i18n.language === 'he'
}

export async function initI18n(): Promise<void> {
  // Check for persisted user preference first
  let savedLang: string | null = null
  try {
    savedLang = await AsyncStorage.getItem(STORAGE_KEY)
  } catch {}

  // Fall back to device locale
  let detectedLang = 'en'
  if (!savedLang) {
    const [locale] = getLocales()
    const tag = locale?.languageTag ?? 'en'
    detectedLang = tag.startsWith('he') ? 'he' : 'en'
  }

  const language = (savedLang && SUPPORTED_LANGS.includes(savedLang as SupportedLang))
    ? (savedLang as SupportedLang)
    : (detectedLang as SupportedLang)

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        he: { translation: he },
      },
      lng: language,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    })
}

export async function changeLanguage(lang: SupportedLang): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lang)
  await i18n.changeLanguage(lang)
}

export default i18n
