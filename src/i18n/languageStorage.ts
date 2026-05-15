import { DEFAULT_LANGUAGE, LANGUAGE_IDS, type LanguageId } from './languages'

/** Legacy global key — no longer used for reads; cleared on logout. */
export const LEGACY_GLOBAL_LANGUAGE_KEY = 'voicebank.language'

export const AUTH_PREFERRED_LANGUAGE_KEY = 'voicebank.preferred_language'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

function perUserLanguageKey(phone: string): string {
  return `voicebank.language.user.${normalizePhone(phone)}`
}

export function parseLanguageId(value: string | null | undefined): LanguageId | null {
  if (!value) return null
  return LANGUAGE_IDS.has(value as LanguageId) ? (value as LanguageId) : null
}

export function getStoredLanguageForPhone(phone: string | null | undefined): LanguageId | null {
  if (!phone) return null
  try {
    return parseLanguageId(localStorage.getItem(perUserLanguageKey(phone)))
  } catch {
    return null
  }
}

export function setStoredLanguageForPhone(phone: string, lang: LanguageId): void {
  try {
    localStorage.setItem(perUserLanguageKey(phone), lang)
  } catch {
    // ignore storage errors
  }
}

/** Clears session-scoped language keys so the next visitor sees English by default. */
export function clearLanguageSessionStorage(): void {
  try {
    localStorage.removeItem(LEGACY_GLOBAL_LANGUAGE_KEY)
    localStorage.removeItem(AUTH_PREFERRED_LANGUAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

export function resolveLanguageForSession(
  phone: string | null | undefined,
  preferredLanguage: string | null | undefined,
): LanguageId {
  return (
    parseLanguageId(preferredLanguage) ??
    getStoredLanguageForPhone(phone) ??
    DEFAULT_LANGUAGE
  )
}
