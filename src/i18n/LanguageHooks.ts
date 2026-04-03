import { useContext } from 'react'
import { LanguageContext } from './LanguageContextValue'

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}

export function useTranslation() {
  const ctx = useLanguage()
  return { t: ctx.t, language: ctx.language }
}

