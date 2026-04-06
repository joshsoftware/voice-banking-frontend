/** WebRTC / Pipecat session server (listening flow). */
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://voicebanking.joshsoftware.com'

/**
 * Voice embedding enrollment API   
 * Default matches local voiceprint service: `http://localhost:8000/api/v1/voiceprint`
 */
export const VOICEPRINT_API_BASE =
  import.meta.env.VITE_VOICEPRINT_API_BASE ?? 'http://192.168.2.43:7860/'

/** User id for enrollment; replace with auth profile id when available. */
export const VOICE_ENROLL_USER_ID = 'test-user'
