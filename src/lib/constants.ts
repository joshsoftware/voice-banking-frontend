/** WebRTC / Pipecat session server (listening flow).
 * In dev: empty string so browser fetches /start relative to localhost (Vite proxy forwards it).
 * In production: set VITE_API_BASE to the full backend URL. */
export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '')

/** Auth / login API (OTP, verify, refresh, logout). Defaults to local backend. */
export const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE ?? 'http://localhost:7860'

/**
 * Voice embedding enrollment API
 * Default matches hosted voiceprint service.
 */
export const VOICEPRINT_API_BASE =
  import.meta.env.VITE_VOICEPRINT_API_BASE ?? 'https://voicebanking.joshsoftware.com'

/** User id for enrollment; replace with auth profile id when available. */
export const VOICE_ENROLL_USER_ID = 'test-user'
