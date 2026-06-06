/// <reference types="vite/client" />

// Custom environment variables (must be prefixed with VITE_ to reach the
// browser). VITE_API_URL is the full backend URL in production, e.g.
// "https://zyadcoin-backend.onrender.com". Unset in local dev (the Vite proxy
// forwards /api to the backend instead).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
