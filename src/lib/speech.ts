import type { LanguageId } from '@/i18n/languages'

export const SPEECH_LOCALE_BY_LANGUAGE: Record<LanguageId, string> = {
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

const VOICE_LOAD_TIMEOUT_MS = 800

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  return window.speechSynthesis
}

export function ensureSpeechVoicesLoaded(): Promise<SpeechSynthesisVoice[]> {
  const synth = getSpeechSynthesis()
  if (!synth) return Promise.resolve([])

  const voices = synth.getVoices()
  if (voices.length > 0) return Promise.resolve(voices)

  return new Promise((resolve) => {
    const previousHandler = synth.onvoiceschanged
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      synth.onvoiceschanged = previousHandler
      resolve(synth.getVoices())
    }

    const timeoutId = window.setTimeout(finish, VOICE_LOAD_TIMEOUT_MS)
    synth.onvoiceschanged = (event) => {
      previousHandler?.call(synth, event)
      finish()
    }
  })
}

export function isLanguageSupported(language: LanguageId): boolean {
  const synth = getSpeechSynthesis()
  if (!synth) return false

  const voices = synth.getVoices()
  const target = SPEECH_LOCALE_BY_LANGUAGE[language].toLowerCase()

  return voices.some((v) => v.lang.toLowerCase() === target)
}

function pickBestVoice(language: LanguageId): SpeechSynthesisVoice | null {
  const synth = getSpeechSynthesis()
  if (!synth) return null

  const targetLocale = (SPEECH_LOCALE_BY_LANGUAGE[language] || SPEECH_LOCALE_BY_LANGUAGE.en).toLowerCase()
  const languagePrefix = targetLocale.split('-')[0]
  const voices = synth.getVoices()
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
  const synth = getSpeechSynthesis()
  if (!synth) return
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SPEECH_LOCALE_BY_LANGUAGE[language] || SPEECH_LOCALE_BY_LANGUAGE.en
  const selectedVoice = pickBestVoice(language)
  if (selectedVoice) {
    utterance.voice = selectedVoice
    utterance.lang = selectedVoice.lang
  }
  utterance.rate = 0.95
  if (onEnd) utterance.onend = onEnd
  synth.speak(utterance)
}

export function stopSpeech(): void {
  const synth = getSpeechSynthesis()
  if (!synth) return
  synth.cancel()
}
