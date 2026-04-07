/**
 * Browser text-to-speech for image descriptions. Backend audio can replace this later.
 */
export function speakText(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-IN'
  utterance.rate = 0.95
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
}

export function stopSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
}
