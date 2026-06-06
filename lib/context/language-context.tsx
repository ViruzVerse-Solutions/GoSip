'use client'
// lib/context/language-context.tsx

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import {
  LanguageCode,
  TranslationKey,
  translations,
  LANGUAGES,
  Language,
} from '@/lib/i18n/translations'

const STORAGE_KEY = 'gosip-lang'
const DEFAULT_LANG: LanguageCode = 'en'

interface LanguageContextType {
  lang:     LanguageCode
  language: Language
  setLang:  (code: LanguageCode) => void
  t:        (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANG)

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null
      if (saved && translations[saved]) setLangState(saved)
    } catch {
      // localStorage not available (SSR edge case) — stay on default
    }
  }, [])

  // Apply document direction for RTL languages (Urdu)
  useEffect(() => {
    const language = LANGUAGES.find((l) => l.code === lang)
    if (typeof document !== 'undefined') {
      document.documentElement.dir  = language?.direction ?? 'ltr'
      document.documentElement.lang = lang
    }
  }, [lang])

  const setLang = useCallback((code: LanguageCode) => {
    setLangState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // ignore
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey): string =>
      translations[lang]?.[key] ?? translations[DEFAULT_LANG][key] ?? key,
    [lang],
  )

  const language = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

  return (
    <LanguageContext.Provider value={{ lang, language, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
