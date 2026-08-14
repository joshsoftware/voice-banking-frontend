/** WebRTC / Pipecat session server (listening flow).
 * In dev: empty string so browser fetches /start relative to localhost (Vite proxy forwards it).
 * In production: set VITE_API_BASE to the full backend URL. */
export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE ?? '')

/** Auth / login API (OTP, verify, refresh, logout). */
// In dev, use relative URLs so requests go through the Vite proxy and work
// even when the UI is opened from another device on LAN.
export const AUTH_API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_AUTH_API_BASE ?? 'https://voicebanking.joshsoftware.com')

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
