/** Preferred MIME for MediaRecorder (matches `voice-banking-frontend` hook). */
export function pickAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  return 'audio/webm'
}
