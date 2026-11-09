import { DEFAULT_FRESHNESS_SECONDS, HEALTH_POLL_MS } from "../config.js"
import { formatRelative, formatTime } from "./format.js"

// ---------------------------------------------------------------------------
// LIVE / WAITING FOR DATA / OFFLINE
//
//  OFFLINE  – the backend cannot be reached: the last /api/health call failed
//             (or none succeeded within 2 poll intervals) AND the WebSocket is
//             not open.
//  LIVE     – the backend is reachable AND the newest VALID reading (stored by
//             the pipeline, or pushed over the WebSocket) is younger than the
//             freshness threshold from /api/config (default 180 s = 3 missed
//             samples at the 60 s sampling interval).
//  WAITING  – the backend is reachable but no reading is that fresh.
//
// Data age uses the server clock (health.server_time) to cancel out a wrong
// browser clock. An open page or an open socket alone never means LIVE.
// ---------------------------------------------------------------------------
export function getDataAgeSeconds(latest, now, clockSkewMs = 0) {
  if (!latest) return null
  return Math.max(0, Math.round((now + clockSkewMs - latest.timestamp.getTime()) / 1000))
}

export function isBackendReachable({ health, wsStatus, now }) {
  const recentHealth = health.lastOkAt && now - health.lastOkAt < HEALTH_POLL_MS * 2 + 5000 && !health.error
  return Boolean(recentHealth || wsStatus === "open")
}

export function getLiveState({ health, wsStatus, latest, now, config }) {
  const threshold = config?.freshness_threshold_seconds ?? DEFAULT_FRESHNESS_SECONDS
  const age = getDataAgeSeconds(latest, now, health.clockSkewMs)
  const reachable = isBackendReachable({ health, wsStatus, now })

  if (!reachable && !health.lastOkAt && !health.error) {
    return { state: "connecting", label: "CONNECTING", short: "CONNECTING", tone: "neutral", age, threshold,
      description: "Menghubungkan ke server AquaSense…" }
  }
  if (!reachable) {
    return { state: "offline", label: "OFFLINE", short: "OFFLINE", tone: "danger", age, threshold,
      description: "Server AquaSense (Node-RED) tidak dapat dijangkau. Menampilkan data terakhir yang diketahui." }
  }
  if (age !== null && age <= threshold) {
    return { state: "live", label: "LIVE MONITORING", short: "LIVE", tone: "good", age, threshold,
      description: "Data sensor valid terbaru sedang diterima." }
  }
  return { state: "waiting", label: "WAITING FOR DATA", short: "WAITING", tone: "warning", age, threshold,
    description: latest
      ? `Sistem terjangkau, tetapi tidak ada pembacaan valid baru dalam ${Math.round(threshold / 60)} menit terakhir.`
      : "Sistem terjangkau, tetapi belum ada pembacaan sensor yang tersimpan." }
}

// ---------------------------------------------------------------------------
// Per-component status. Only what can be observed is reported; everything
// else is "Unknown" / "Not available".
// ---------------------------------------------------------------------------
const UNKNOWN = (note) => ({ label: "Unknown", tone: "neutral", note })

export function getComponentStatus({ health, wsStatus, latest, live, now, system }) {
  const h = health.data
  const reachable = live.state !== "offline" && live.state !== "connecting"
  const lastData = latest ? `Last valid data ${formatTime(latest.timestamp)} (${formatRelative(latest.timestamp, now)})` : "No reading received yet"

  const esp32 = !reachable
    ? UNKNOWN(`Backend unreachable. ${lastData}`)
    : live.state === "live"
      ? { label: "Sending data", tone: "good", note: lastData }
      : latest
        ? { label: "No recent data", tone: "warning", note: lastData }
        : UNKNOWN("No reading received yet")

  const mqttState = h?.mqtt?.status
  const mqtt = !reachable || !h
    ? UNKNOWN("Reported by Node-RED when reachable")
    : mqttState === "connected"
      ? { label: "Connected", tone: "good", note: h.mqtt.last_message_at ? `Last message ${formatRelative(new Date(h.mqtt.last_message_at), now)}` : "Node-RED subscribed to the broker" }
      : mqttState === "disconnected"
        ? { label: "Disconnected", tone: "danger", note: "Node-RED lost the broker connection" }
        : mqttState === "connecting"
          ? { label: "Connecting", tone: "warning", note: "Node-RED is connecting to the broker" }
          : UNKNOWN("No MQTT status event observed since Node-RED start")

  const nodered = health.error && wsStatus !== "open"
    ? { label: "Offline", tone: "danger", note: latest ? `Last successful data ${formatTime(latest.timestamp)}` : health.error }
    : health.lastOkAt || wsStatus === "open"
      ? { label: "Running", tone: "good", note: h?.node_red?.started_at ? `Up since ${formatRelative(new Date(h.node_red.started_at), now).replace(" ago", "")}` : "Responding" }
      : { label: "Checking…", tone: "neutral", note: "Requesting /api/health" }

  const mysql = !h || !reachable
    ? UNKNOWN("Checked through Node-RED")
    : h.database?.status === "connected"
      ? { label: "Connected", tone: "good", note: "Queried by /api/health" }
      : { label: "Unreachable", tone: "danger", note: "Stored history is unavailable until it recovers" }

  const websocket =
    wsStatus === "open"
      ? { label: "Connected", tone: "good", note: "Receiving push updates" }
      : wsStatus === "connecting"
        ? { label: "Connecting…", tone: "neutral", note: "Opening socket" }
        : { label: "Disconnected", tone: "danger", note: "Reconnecting automatically" }

  return { esp32, mqtt, nodered, mysql, websocket, telegram: getTelegramStatus(system, reachable) }
}

// Telegram delivery can only be verified from notification_log (admin API):
// the result of the LAST attempt decides the status. The node status
// (polling / connection) is a separate signal shown on the Telegram page.
export function getTelegramStatus(system, reachable = true) {
  if (!reachable) return UNKNOWN("Backend unreachable")
  const t = system?.telegram
  if (!t) return { label: "Not available", tone: "neutral", note: "Visible to the administrator" }
  if (t.last_delivery_status === "FAILED") {
    return { label: "Delivery failed", tone: "danger", note: t.last_error || t.node_status || "Last notification could not be delivered" }
  }
  if (t.last_delivery_status === "SENT") {
    return { label: "Delivered", tone: "good", note: `Last message delivered ${formatRelative(new Date(t.last_sent_at))}` }
  }
  if (t.node_status_fill === "red") return { label: "Error", tone: "danger", note: t.node_status }
  return { label: "Waiting", tone: "neutral", note: "Bot configured; no notification sent yet, so delivery is not verified" }
}
