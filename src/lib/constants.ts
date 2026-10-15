/** WebRTC / Pipecat session server (listening flow).
 * In dev: empty string so browser fetches /start relative to localhost (Vite proxy forwards it).
 * In production: set VITE_API_BASE to the full backend URL. */
export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '')

/** Auth / login API (OTP, verify, refresh, logout).
 * Dev: relative URLs so Vite can proxy.
 * Deployed: VITE_AUTH_API_BASE, else VITE_API_BASE, else same-origin.
 * Never fall back to a hardcoded prod host — that made stage UI call prod. */
export const AUTH_API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_AUTH_API_BASE ?? import.meta.env.VITE_API_BASE ?? '')

/** Java banking APIs (customer lookup, transactions, loans, transfers).
 * Relative `/api/v1` in both dev and deploy so the request stays on the same host:
 *   stage UI → https://voicebank-stage.joshsoftware.com/api/v1
 *   prod UI  → https://voicebanking.joshsoftware.com/api/v1
 * Set VITE_JAVA_API_BASE only to override that (never leave it pointing at the other env). */
export const JAVA_API_BASE = import.meta.env.VITE_JAVA_API_BASE || '/api/v1'

/**
 * Voice embedding enrollment API
 * Default matches hosted voiceprint service.
 */
export const VOICEPRINT_API_BASE =
  import.meta.env.VITE_VOICEPRINT_API_BASE ?? 'https://voicebanking.joshsoftware.com'

/** Customer identity comes from the mock-bank phone lookup API. */
export const CUSTOMER_DATA_SOURCE = 'mock-bank-api'

/**
 * Enrollment step count (build-time flag).
 * - 3: classic flow — 3 image descriptions
 * - 6: extended flow — 2 images + 4 short questions (default)
 * Set via VITE_ENROLLMENT_TOTAL_STEPS=3|6
 */
const rawEnrollmentSteps = import.meta.env.VITE_ENROLLMENT_TOTAL_STEPS
export const ENROLLMENT_TOTAL_STEPS: 3 | 6 = rawEnrollmentSteps === '3' ? 3 : 6
export const ENROLLMENT_IMAGE_COUNT = ENROLLMENT_TOTAL_STEPS === 3 ? 3 : 2
export const ENROLLMENT_QUESTION_COUNT = ENROLLMENT_TOTAL_STEPS === 3 ? 0 : 4

/** Multi-session "Improve voice ID" menu + home banner. Off unless VITE_ENABLE_VOICE_FOLLOWUP=true. */
export const ENABLE_VOICE_FOLLOWUP = import.meta.env.VITE_ENABLE_VOICE_FOLLOWUP === 'true'

/**
 * Browser noise suppression (Chrome `noiseSuppression`) for STT, enrollment,
 * and in-call verification. On unless VITE_DISABLE_BROWSER_NOISE_CANCELLATION=true.
 */
export const DISABLE_BROWSER_NOISE_CANCELLATION =
  import.meta.env.VITE_DISABLE_BROWSER_NOISE_CANCELLATION === 'true'

/**
 * How often (ms) the enrollment mic stream is sent to the server. Each request carries that much audio and the server
 * takes at most 2 s per request, so 250-2000 is accepted; anything else falls back to 1500. A proxy that allows about
 * 1 request per second needs this above 1000. Set via VITE_RAWMIC_FLUSH_MS (build time).
 */
const rawFlushMs = Number(import.meta.env.VITE_RAWMIC_FLUSH_MS)
export const RAWMIC_FLUSH_MS = Number.isFinite(rawFlushMs) && rawFlushMs >= 250 && rawFlushMs <= 2000 ? rawFlushMs : 1500

/** `{ audio: true }` left the browser noise suppressor on. This is the env-gated replacement. */
export function micAudioConstraint(): true | MediaTrackConstraints {
  if (!DISABLE_BROWSER_NOISE_CANCELLATION) return true
  return { noiseSuppression: false }
}
