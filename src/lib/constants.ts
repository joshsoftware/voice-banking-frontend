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
 * In dev: relative `/api/v1` so Vite can proxy to local mock-bank.
 * In production/stage: VITE_JAVA_API_BASE, else `{VITE_API_BASE}/api/v1`.
 * Empty build-args must not win over the fallback. */
const hostedBackendOrigin = (
  import.meta.env.VITE_AUTH_API_BASE ||
  import.meta.env.VITE_API_BASE ||
  'https://voicebanking.joshsoftware.com'
).replace(/\/$/, '')

export const JAVA_API_BASE = import.meta.env.DEV
  ? '/api/v1'
  : (import.meta.env.VITE_JAVA_API_BASE || `${hostedBackendOrigin}/api/v1`)

/**
 * Voice embedding enrollment API
 * Default matches hosted voiceprint service.
 */
export const VOICEPRINT_API_BASE =
  import.meta.env.VITE_VOICEPRINT_API_BASE ?? 'https://voicebanking.joshsoftware.com'

/** Customer identity comes from the mock-bank phone lookup API. */
export const CUSTOMER_DATA_SOURCE = 'mock-bank-api'
