// Stringa vuota è valida (chiamate relative per il deploy via Envoy)
const _env: string | undefined = import.meta.env.VITE_API_URL
export const API_URL = _env !== undefined ? _env : "http://localhost:8002"
