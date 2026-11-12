/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** TMDB API Read Access Token, for local development only. */
  readonly VITE_TMDB_ACCESS_TOKEN?: string;
  /** Overrides the API base (TMDB itself or a proxy). */
  readonly VITE_TMDB_API_BASE?: string;
  readonly VITE_TMDB_IMAGE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
