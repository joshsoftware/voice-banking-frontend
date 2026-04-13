/** WebRTC / Pipecat session server (listening flow). */
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:7860'

/**
 * Voice embedding enrollment API   
 * Default matches local voiceprint service: `https://voicebanking.joshsoftware.com/`
 */
export const VOICEPRINT_API_BASE =
  import.meta.env.VITE_VOICEPRINT_API_BASE ?? 'http://localhost:7860'

/** User id for enrollment; replace with auth profile id when available. */
export const VOICE_ENROLL_USER_ID = 'test-user'
