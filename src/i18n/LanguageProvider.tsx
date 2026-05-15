import type { PropsWithChildren } from 'react'
import { useLayoutEffect, useMemo, useState } from 'react'
import { DEFAULT_LANGUAGE, type LanguageId } from './languages'
import { useAuth } from '@/contexts/AuthContext'
import { LanguageContext } from './LanguageContextValue'
import {
  AUTH_PREFERRED_LANGUAGE_KEY,
  resolveLanguageForSession,
  setStoredLanguageForPhone,
} from './languageStorage'
import {
  TRANSLATIONS,
  type InterpolationValues,
  type TranslationKey,
  getEnglishTranslation,
  interpolate,
} from './translations'

const ACCESS_TOKEN_KEY = 'voicebank.access_token'
const MOBILE_NUMBER_KEY = 'voicebank.mobile_number'

export function LanguageProvider({ children }: PropsWithChildren) {
  const {
    preferredLanguage: authPreferredLanguage,
    mobileNumber,
    isAuthenticated,
    setPreferredLanguage,
  } = useAuth()

  const [language, setLanguageState] = useState<LanguageId>(() => {
    try {
      const hasSession = Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
      if (!hasSession) return DEFAULT_LANGUAGE
      const phone = localStorage.getItem(MOBILE_NUMBER_KEY)
      const preferred = localStorage.getItem(AUTH_PREFERRED_LANGUAGE_KEY)
      return resolveLanguageForSession(phone, preferred)
    } catch {
      return DEFAULT_LANGUAGE
    }
  })

  // Logged out → English. Logged in → sync with this user's saved preference.
  useLayoutEffect(() => {
    if (!isAuthenticated) {
      setLanguageState((prev) => (prev === DEFAULT_LANGUAGE ? prev : DEFAULT_LANGUAGE))
      return
    }
    const next = resolveLanguageForSession(mobileNumber, authPreferredLanguage)
    setLanguageState((prev) => (prev === next ? prev : next))
  }, [isAuthenticated, authPreferredLanguage, mobileNumber])

  const setLanguage = (lang: LanguageId) => {
    setLanguageState(lang)
    if (!isAuthenticated || !mobileNumber) return
    setStoredLanguageForPhone(mobileNumber, lang)
    setPreferredLanguage(lang)
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

