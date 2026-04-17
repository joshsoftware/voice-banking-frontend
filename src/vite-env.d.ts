/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_VOICEPRINT_API_BASE?: string
  readonly VITE_AUTH_API_BASE?: string
  readonly VITE_JAVA_API_BASE?: string
  readonly VITE_JAVA_BACKEND?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
