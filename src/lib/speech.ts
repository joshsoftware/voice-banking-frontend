import type { LanguageId } from '@/i18n/languages'

const SPEECH_LOCALE_BY_LANGUAGE: Record<LanguageId, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
}

function pickBestVoice(language: LanguageId): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null

  const targetLocale = (SPEECH_LOCALE_BY_LANGUAGE[language] || SPEECH_LOCALE_BY_LANGUAGE.en).toLowerCase()
  const languagePrefix = targetLocale.split('-')[0]
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const exact = voices.find((v) => v.lang.toLowerCase() === targetLocale)
  if (exact) return exact

  const sameLanguage = voices.find((v) => v.lang.toLowerCase().startsWith(`${languagePrefix}-`))
  if (sameLanguage) return sameLanguage

  const englishIndian = voices.find((v) => v.lang.toLowerCase() === SPEECH_LOCALE_BY_LANGUAGE.en.toLowerCase())
  if (englishIndian) return englishIndian

  const englishAny = voices.find((v) => v.lang.toLowerCase().startsWith('en-'))
  if (englishAny) return englishAny

  return voices[0] ?? null
}

/**
 * Browser text-to-speech for image descriptions. Backend audio can replace this later.
 */
export function speakText(text: string, language: LanguageId = 'en', onEnd?: () => void): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SPEECH_LOCALE_BY_LANGUAGE[language] || SPEECH_LOCALE_BY_LANGUAGE.en
  const selectedVoice = pickBestVoice(language)
  if (selectedVoice) {
    utterance.voice = selectedVoice
    utterance.lang = selectedVoice.lang
  }
  utterance.rate = 0.95
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}

export function stopSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}
