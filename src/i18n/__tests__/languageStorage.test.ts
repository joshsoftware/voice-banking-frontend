// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'

import {
  AUTH_PREFERRED_LANGUAGE_KEY,
  LEGACY_GLOBAL_LANGUAGE_KEY,
  clearLanguageSessionStorage,
  getStoredLanguageForPhone,
  parseLanguageId,
  resolveLanguageForSession,
  setStoredLanguageForPhone,
} from '../languageStorage'

describe('languageStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('accepts only supported language ids', () => {
    expect(parseLanguageId('hi')).toBe('hi')
    expect(parseLanguageId('invalid')).toBeNull()
    expect(parseLanguageId(null)).toBeNull()
  })

  it('stores language by normalized phone number', () => {
    setStoredLanguageForPhone('+91 98765 43210', 'ta')

    expect(getStoredLanguageForPhone('9876543210')).toBe('ta')
    expect(getStoredLanguageForPhone('000009876543210')).toBe('ta')
  })

  it('resolves backend preference before cached language and default', () => {
    setStoredLanguageForPhone('9876543210', 'kn')

    expect(resolveLanguageForSession('9876543210', 'hi')).toBe('hi')
    expect(resolveLanguageForSession('9876543210', null)).toBe('kn')
    expect(resolveLanguageForSession(null, null)).toBe('en')
  })

  it('clears only session-scoped language keys', () => {
    setStoredLanguageForPhone('9876543210', 'ml')
    localStorage.setItem(LEGACY_GLOBAL_LANGUAGE_KEY, 'hi')
    localStorage.setItem(AUTH_PREFERRED_LANGUAGE_KEY, 'ta')

    clearLanguageSessionStorage()

    expect(localStorage.getItem(LEGACY_GLOBAL_LANGUAGE_KEY)).toBeNull()
    expect(localStorage.getItem(AUTH_PREFERRED_LANGUAGE_KEY)).toBeNull()
    expect(getStoredLanguageForPhone('9876543210')).toBe('ml')
  })
})

