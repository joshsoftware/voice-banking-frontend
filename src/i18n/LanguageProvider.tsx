import type { PropsWithChildren } from 'react'
import { useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE, LANGUAGE_IDS, type LanguageId } from './languages'
import { LanguageContext } from './LanguageContextValue'
import {
  TRANSLATIONS,
  type InterpolationValues,
  type TranslationKey,
  getEnglishTranslation,
  interpolate,
} from './translations'

const STORAGE_KEY = 'voicebank.language'

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<LanguageId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && LANGUAGE_IDS.has(saved as LanguageId)) return saved as LanguageId
    } catch {
      // ignore storage errors
    }
    return DEFAULT_LANGUAGE
  })

  const setLanguage = (lang: LanguageId) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore storage errors
    }
  }

  const t: <K extends TranslationKey>(key: K, values?: InterpolationValues) => string = useMemo(() => {
    return (key, values) => {
      const dictValue = TRANSLATIONS[language]?.[key]
      const fallback = getEnglishTranslation(key)
      return interpolate(dictValue ?? fallback, values)
    }
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

