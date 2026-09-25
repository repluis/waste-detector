/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODEL_URL?: string
  readonly VITE_SCORE_THRESHOLD?: string
  readonly VITE_LOG_LEVEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
