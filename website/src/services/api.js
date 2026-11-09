import { API_URL } from "../config.js"
import { normalizeReading } from "../utils/reading.js"

const TIMEOUT_MS = 10_000

// Error carrying the HTTP status and the backend's machine-readable code.
// `message` is always a user-facing sentence, never a stack trace.
export class ApiError extends Error {
  constructor(message, { status = 0, code = null, cause } = {}) {
    super(message, { cause })
    this.status = status
    this.code = code
  }
  get isNetwork() {
    return this.status === 0
  }
  get isUnauthorized() {
    return this.status === 401
  }
}

// Session-expiry hook, registered by AuthProvider.
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function request(path, { method = "GET", body, signal, auth = false, timeout = TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timer = setTimeout(abort, timeout)
  signal?.addEventListener("abort", abort)

  try {
    let res
    try {
      res = await fetch(`${API_URL}${path}`, {
        method,
        signal: controller.signal,
        credentials: "same-origin",
        headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch (err) {
      if (signal?.aborted) throw err
      throw new ApiError(
        controller.signal.aborted
          ? "Server tidak merespons. Periksa koneksi ke Node-RED."
          : "Tidak dapat terhubung ke server AquaSense.",
        { cause: err },
      )
    }

    let payload = null
    try {
      payload = await res.json()
    } catch {
      // non-JSON (e.g. proxy error page)
    }

    if (!res.ok || !payload || payload.success !== true) {
      const message =
        payload?.message ||
        (res.status === 502 || res.status === 504
          ? "Node-RED tidak dapat dijangkau."
          : `Permintaan gagal (HTTP ${res.status}).`)
      const error = new ApiError(message, { status: res.status, code: payload?.code ?? null })
      if (auth && res.status === 401) onUnauthorized?.(error)
      throw error
    }
    return payload.data
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", abort)
  }
}

function query(params) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "" && value !== "all") q.set(key, value)
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

// ---------------------------------------------------------------- public
export const fetchHealth = (options) => request("/api/health", options)
export const fetchConfig = (options) => request("/api/config", options)

// Newest stored reading — null when the database has no records yet.
export async function fetchLatest(options) {
  const data = await request("/api/water/latest", options)
  return data ? normalizeReading(data) : null
}

// Latest 500 readings (newest first) for real-time charts and Kalman analysis.
export async function fetchRecent(options) {
  const data = await request("/api/water/history", options)
  if (!Array.isArray(data)) throw new ApiError("Format data riwayat tidak valid.")
  return data.map(normalizeReading).filter(Boolean)
}

// One page of filtered history (server-side filtering + pagination).
export async function fetchReadings(filters, options) {
  const data = await request(`/api/water/readings${query(filters)}`, options)
  return { ...data, rows: data.rows.map(normalizeReading).filter(Boolean) }
}

// Statistics over exactly the rows matched by `filters`.
export const fetchSummary = (filters, options) => request(`/api/water/summary${query(filters)}`, options)

// Stored readings of a chart period (range: 15m | 1h | 24h | all | custom with
// from/to WITA dates), oldest first. Large periods come back thinned to every
// k-th stored reading (data.stride) — for drawing only.
async function seriesRequest(path, options) {
  const data = await request(path, options)
  if (!Array.isArray(data?.rows)) throw new ApiError("Format data grafik tidak valid.")
  return { ...data, rows: data.rows.map(normalizeReading).filter(Boolean) }
}
export const fetchSeries = (params, options) => seriesRequest(`/api/water/series${query(params)}`, options)

// Every stored reading of a WITA date period (both dates empty = all time) for
// the Kalman evaluation charts. range=all is written out explicitly because
// query() drops the value "all" and the endpoint then defaults to 1h.
export const fetchPeriodSeries = ({ from, to, max }, options) =>
  seriesRequest(`/api/water/series${from && to ? query({ range: "custom", from, to, max }) : `?range=all&max=${max}`}`, options)

// Kalman Filter evaluation metrics over every stored row of the period.
export const fetchMetrics = (filters, options) => request(`/api/water/metrics${query(filters)}`, options)

// ---------------------------------------------------------------- auth / admin
export const login = (username, password) =>
  request("/api/auth/login", { method: "POST", body: { username, password } })
export const logout = () => request("/api/auth/logout", { method: "POST", body: {} })
export const fetchMe = (options) => request("/api/auth/me", options)
// Public: { user } for an admin session, { user: null } otherwise (no 401 noise).
export const fetchSession = (options) => request("/api/auth/session", options)

export const updateProfile = (profile) => request("/api/admin/profile", { method: "PUT", body: profile, auth: true })
export const uploadPhoto = (dataUrl) =>
  request("/api/admin/profile/photo", { method: "PUT", body: { image: dataUrl }, auth: true, timeout: 20_000 })
export const removePhoto = () => request("/api/admin/profile/photo", { method: "DELETE", auth: true })
export const changePassword = (body) => request("/api/admin/password", { method: "POST", body, auth: true })

export const fetchNotifications = (limit = 50, options) =>
  request(`/api/admin/notifications${query({ limit })}`, { ...options, auth: true })
export const fetchAudit = (limit = 10, options) => request(`/api/admin/audit${query({ limit })}`, { ...options, auth: true })
export const fetchSystem = (options) => request("/api/admin/system", { ...options, auth: true })
export const sendTelegramTest = () => request("/api/admin/telegram/test", { method: "POST", body: {}, auth: true })
// Waits for Telegram's real answer (the backend gives up after 30 s → FAILED).
export const resendNotification = (id) =>
  request(`/api/admin/notifications/${encodeURIComponent(id)}/send`, { method: "POST", body: {}, auth: true, timeout: 40_000 })
export const deleteNotification = (id) =>
  request(`/api/admin/notifications/${encodeURIComponent(id)}`, { method: "DELETE", auth: true })

// Every row matching the filters (not just the visible page).
export async function fetchExport(filters) {
  const data = await request(`/api/admin/export${query(filters)}`, { auth: true, timeout: 60_000 })
  return { ...data, rows: data.rows.map(normalizeReading).filter(Boolean) }
}

export const photoUrl = (version) => `${API_URL}/api/admin/profile/photo${version ? `?v=${encodeURIComponent(version)}` : ""}`
