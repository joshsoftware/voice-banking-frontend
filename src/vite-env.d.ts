/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_VOICEPRINT_API_BASE?: string
  readonly VITE_AUTH_API_BASE?: string
  readonly VITE_JAVA_API_BASE?: string
  readonly VITE_JAVA_BACKEND?: string
  /** `3` = images-only enrollment; `6` (default) = 2 images + 4 questions */
  readonly VITE_ENROLLMENT_TOTAL_STEPS?: '3' | '6'
  /** `true` to show Improve voice ID / follow-up enrollment UI */
  readonly VITE_ENABLE_VOICE_FOLLOWUP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
