import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '../locales/en.json'
import he from '../locales/he.json'

export const STORAGE_KEY = 'clubby_lang'
export const SUPPORTED_LANGS = ['en', 'he'] as const
export type SupportedLang = typeof SUPPORTED_LANGS[number]

export function isHebrew(): boolean {
  return i18n.language === 'he'
}

export function applyDirection(lang: string) {
  const dir = lang === 'he' ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lang
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'he'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lang) => {
  applyDirection(lang)
  localStorage.setItem(STORAGE_KEY, lang)
})

// Apply direction on init
applyDirection(i18n.language)

export async function changeLanguage(lang: SupportedLang): Promise<void> {
  await i18n.changeLanguage(lang)
}

export default i18n
