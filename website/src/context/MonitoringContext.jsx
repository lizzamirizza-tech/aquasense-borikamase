import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { FALLBACK_POLL_MS, HEALTH_POLL_MS, MAX_READINGS, WS_URL } from "../config.js"
import { fetchConfig, fetchHealth, fetchLatest, fetchRecent } from "../services/api.js"
import { mergeReadings, newestOf, normalizeReading } from "../utils/reading.js"

// Single source of monitoring data for every page (public and admin):
//  - REST on load: latest reading, the latest 500 readings, config, health
//  - one WebSocket for new readings (exponential-backoff reconnect)
//  - /api/health polling for LIVE / WAITING / OFFLINE
// The last known readings are never cleared when the socket or API drops.
const MonitoringContext = createContext(null)

const MAX_RECONNECT_DELAY_MS = 15_000

export function MonitoringProvider({ children }) {
  const [config, setConfig] = useState(null)
  const [latestFromApi, setLatestFromApi] = useState(null)
  const [readings, setReadings] = useState([]) // newest first
  const [recentState, setRecentState] = useState({ status: "loading", error: null })
  const [health, setHealth] = useState({ data: null, error: null, lastOkAt: null, clockSkewMs: 0 })
  const [wsStatus, setWsStatus] = useState("connecting") // connecting | open | reconnecting
  const [lastMessageAt, setLastMessageAt] = useState(null)
  const reloadRef = useRef(null)
  const healthRef = useRef(null)

  // ---- REST: latest + recent readings
  const loadReadings = useCallback(async (signal) => {
    const [latest, recent] = await Promise.allSettled([fetchLatest({ signal }), fetchRecent({ signal })])
    if (signal?.aborted) return
    if (latest.status === "fulfilled") setLatestFromApi(latest.value)
    if (recent.status === "fulfilled") {
      setReadings((prev) => mergeReadings(recent.value, prev, MAX_READINGS))
      setRecentState({ status: "ok", error: null })
    } else {
      setRecentState((prev) => ({ status: prev.status === "ok" ? "ok" : "error", error: recent.reason?.message ?? "Request failed" }))
    }
  }, [])

  // ---- health
  const loadHealth = useCallback(async (signal) => {
    try {
      const sentAt = Date.now()
      const data = await fetchHealth({ signal })
      const receivedAt = Date.now()
      const serverTime = Date.parse(data.server_time)
      const clockSkewMs = Number.isFinite(serverTime) ? serverTime - (sentAt + receivedAt) / 2 : 0
      setHealth({ data, error: null, lastOkAt: receivedAt, clockSkewMs })
    } catch (err) {
      if (signal?.aborted) return
      setHealth((prev) => ({ ...prev, error: err.message }))
    }
  }, [])

  useEffect(() => {
    reloadRef.current = loadReadings
    healthRef.current = loadHealth
  }, [loadReadings, loadHealth])

  useEffect(() => {
    const controller = new AbortController()
    loadReadings(controller.signal)
    loadHealth(controller.signal)
    const id = setInterval(() => loadHealth(), HEALTH_POLL_MS)
    return () => {
      controller.abort()
      clearInterval(id)
    }
  }, [loadReadings, loadHealth])

  // ---- config (retried until the backend answers)
  useEffect(() => {
    if (config) return
    let cancelled = false
    let timer = null
    const attempt = () =>
      fetchConfig()
        .then((c) => !cancelled && setConfig(c))
        .catch(() => {
          if (!cancelled) timer = setTimeout(attempt, 30_000)
        })
    attempt()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [config])

  // ---- fallback polling of the latest reading while the socket is down
  useEffect(() => {
    if (wsStatus === "open") return
    const id = setInterval(() => {
      fetchLatest()
        .then((r) => setLatestFromApi((prev) => newestOf(prev, r)))
        .catch(() => {})
    }, FALLBACK_POLL_MS)
    return () => clearInterval(id)
  }, [wsStatus])

  // ---- WebSocket (one connection for the whole app)
  useEffect(() => {
    let socket = null
    let timer = null
    let attempt = 0
    let disposed = false

    function scheduleReconnect() {
      if (disposed) return
      attempt += 1
      setWsStatus("reconnecting")
      const delay = Math.min(1000 * 2 ** (attempt - 1), MAX_RECONNECT_DELAY_MS)
      timer = setTimeout(connect, delay)
    }

    function connect() {
      if (disposed) return
      setWsStatus(attempt === 0 ? "connecting" : "reconnecting")
      try {
        socket = new WebSocket(WS_URL)
      } catch {
        scheduleReconnect()
        return
      }

      socket.onopen = () => {
        const wasReconnect = attempt > 0
        attempt = 0
        setWsStatus("open")
        if (wasReconnect) {
          // fill any gap that happened while the socket was down
          reloadRef.current?.()
          healthRef.current?.()
        }
      }

      socket.onmessage = (event) => {
        let parsed
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }
        const reading = normalizeReading(parsed?.data ?? parsed)
        if (!reading) return // invalid payloads are ignored, never shown
        setLastMessageAt(Date.now())
        setReadings((prev) => mergeReadings([reading], prev, MAX_READINGS))
      }

      // onerror is always followed by onclose, which handles the reconnect
      socket.onerror = () => {}
      socket.onclose = () => {
        socket = null
        scheduleReconnect()
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(timer)
      if (!socket) return
      const s = socket
      s.onclose = null
      s.onmessage = null
      s.onerror = null
      // closing a socket that is still connecting logs a browser warning,
      // so let it finish opening and close it then
      if (s.readyState === WebSocket.CONNECTING) s.onopen = () => s.close()
      else s.close()
    }
  }, [])

  const refresh = useCallback(() => Promise.all([loadReadings(), loadHealth()]), [loadReadings, loadHealth])

  const latest = useMemo(() => newestOf(latestFromApi, readings[0] ?? null), [latestFromApi, readings])
  const initialLoading = !latest && recentState.status === "loading"

  const value = useMemo(
    () => ({ config, latest, readings, recentState, health, wsStatus, lastMessageAt, initialLoading, refresh }),
    [config, latest, readings, recentState, health, wsStatus, lastMessageAt, initialLoading, refresh],
  )
  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMonitoring() {
  const ctx = useContext(MonitoringContext)
  if (!ctx) throw new Error("useMonitoring must be used inside MonitoringProvider")
  return ctx
}
