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
