import type { InterpolationValues, TranslationKey } from './translations'
import type { LanguageId } from './languages'
import { createContext } from 'react'

export type LanguageContextValue = {
  language: LanguageId
  setLanguage: (lang: LanguageId) => void
  t: <K extends TranslationKey>(key: K, values?: InterpolationValues) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

