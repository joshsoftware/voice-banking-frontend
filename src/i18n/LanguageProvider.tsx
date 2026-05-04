import type { PropsWithChildren } from 'react'
import { useLayoutEffect, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE, LANGUAGE_IDS, type LanguageId } from './languages'
import { useAuth } from '@/contexts/AuthContext'
import { LanguageContext } from './LanguageContextValue'
import {
  TRANSLATIONS,
  type InterpolationValues,
  type TranslationKey,
  getEnglishTranslation,
  interpolate,
} from './translations'

const STORAGE_KEY = 'voicebank.language'
const AUTH_PREFERRED_LANGUAGE_KEY = 'voicebank.preferred_language'

export function LanguageProvider({ children }: PropsWithChildren) {
  const { preferredLanguage: authPreferredLanguage } = useAuth()

  const [language, setLanguageState] = useState<LanguageId>(() => {
    try {
      // First check the auth-stored language (persisted from backend on login)
      const authLang = localStorage.getItem(AUTH_PREFERRED_LANGUAGE_KEY)
      if (authLang && LANGUAGE_IDS.has(authLang as LanguageId)) return authLang as LanguageId
      // Fallback to the i18n local storage
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && LANGUAGE_IDS.has(saved as LanguageId)) return saved as LanguageId
    } catch {
      // ignore storage errors
    }
    return DEFAULT_LANGUAGE
  })

  // After login, AuthContext writes `voicebank.preferred_language` but same-tab
  // storage events do not fire — keep UI + WebRTC `lang` in sync with the server.
  // useLayoutEffect: run before paint so the first frame after OTP/navigation is not
  // still `en` while auth already has `hi` (otherwise /start can race with English).
  useLayoutEffect(() => {
    if (!authPreferredLanguage) return
    if (!LANGUAGE_IDS.has(authPreferredLanguage as LanguageId)) return
    const next = authPreferredLanguage as LanguageId
    setLanguageState((prev) => (prev === next ? prev : next))
  }, [authPreferredLanguage])

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

