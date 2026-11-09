// Runtime configuration.
//
// By default the dashboard talks to Node-RED through the same origin: the Vite
// dev/preview server proxies /api and /ws to Node-RED (see vite.config.js).
// Same-origin requests are what allow the HttpOnly admin session cookie to
// work without exposing any token to JavaScript. VITE_API_URL / VITE_WS_URL
// only need to be set when the dashboard is served from somewhere else.
// No secrets belong in VITE_* variables — they end up in the browser bundle.
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "")

function defaultWsUrl() {
  if (typeof window === "undefined") return "ws://localhost:1880/ws/aquasense"
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
  return `${proto}//${window.location.host}/ws/aquasense`
}
export const WS_URL = import.meta.env.VITE_WS_URL || defaultWsUrl()

// Monitoring timestamps are always displayed in WITA, whatever the browser zone.
export const TIMEZONE = "Asia/Makassar"
export const TIMEZONE_LABEL = "WITA"

// Fallbacks used only until GET /api/config has answered; the backend values win.
export const DEFAULT_DEVICE_ID = "AM-BORIKAMASE-01"
export const DEFAULT_FRESHNESS_SECONDS = 180

// Health is polled for LIVE / WAITING / OFFLINE; latest is re-polled only
// while the WebSocket is down.
export const HEALTH_POLL_MS = 15_000
export const FALLBACK_POLL_MS = 30_000

// Readings kept in memory (newest first) for live updates and analysis.
export const MAX_READINGS = 1000

// Fluctuation / stability window (see utils/statistics.js).
export const STABILITY_WINDOW = 10
