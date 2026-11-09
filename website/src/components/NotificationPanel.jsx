import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Bell, BellOff } from "lucide-react"
import StatusBadge from "./StatusBadge.jsx"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { useLiveState } from "../hooks/useAquaSense.js"
import { useDismiss } from "../hooks/useDismiss.js"
import { fetchNotifications } from "../services/api.js"
import { formatDateTime, formatRelative } from "../utils/format.js"
import { displayTime, eventLabel } from "../utils/notification.js"
import { isErrorStatus } from "../utils/sensorHealth.js"

const SEEN_KEY = "aquasense.notifications.seen"
const SEVERITY_TONE = { GOOD: "good", WARNING: "warning", DANGER: "danger", ERROR: "danger", INFO: "neutral" }

function readSeen() {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0
  } catch {
    return 0
  }
}

// Current conditions derived from real system state — nothing is invented.
function useActiveAlerts() {
  const { latest, health, wsStatus } = useMonitoring()
  const { live } = useLiveState(5000)
  return useMemo(() => {
    const alerts = []
    if (latest?.water_quality === "DANGER" || latest?.water_quality === "WARNING") {
      alerts.push({
        key: `quality-${latest.water_quality}`,
        severity: latest.water_quality,
        title: `Water quality ${latest.water_quality}`,
        description: "Latest classified reading from Node-RED.",
        at: latest.timestamp,
      })
    }
    if (latest && isErrorStatus(latest.sensor_status)) {
      alerts.push({ key: "sensor", severity: "ERROR", title: "Sensor error", description: `Device reported ${latest.sensor_status}.`, at: latest.timestamp })
    }
    if (live.state === "offline") {
      alerts.push({ key: "offline", severity: "ERROR", title: "Backend unreachable", description: "Node-RED cannot be reached. Showing last known data." })
    } else if (live.state === "waiting") {
      alerts.push({
        key: "waiting",
        severity: "WARNING",
        title: "Waiting for data",
        description: latest ? "No new valid reading within the freshness threshold." : "No reading stored yet.",
        at: latest?.timestamp,
      })
    }
    if (health.data?.database?.status === "unreachable" && live.state !== "offline") {
      alerts.push({ key: "db", severity: "ERROR", title: "Database unreachable", description: "MySQL is not reachable from Node-RED." })
    }
    if (health.data?.mqtt?.status === "disconnected" && live.state !== "offline") {
      alerts.push({ key: "mqtt", severity: "ERROR", title: "MQTT disconnected", description: "Node-RED lost its broker connection." })
    }
    if (wsStatus === "reconnecting" && live.state !== "offline") {
      alerts.push({ key: "ws", severity: "WARNING", title: "Realtime connection lost", description: "WebSocket is reconnecting automatically." })
    }
    return alerts
  }, [latest, health, wsStatus, live.state])
}

export default function NotificationPanel({ isAdmin }) {
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState({ status: isAdmin ? "loading" : "unavailable", rows: [] })
  const [seen, setSeen] = useState(readSeen)
  const ref = useRef(null)
  const alerts = useActiveAlerts()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    const load = () =>
      fetchNotifications(10)
        .then((d) => !cancelled && setLog({ status: "ok", rows: d.rows }))
        .catch(() => !cancelled && setLog((prev) => ({ ...prev, status: prev.rows.length ? "ok" : "error" })))
    load()
    const id = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isAdmin])

  const unseen = log.rows.filter((r) => r.id > seen).length
  const badge = alerts.length + unseen

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && log.rows.length) {
      const maxId = Math.max(...log.rows.map((r) => r.id))
      try {
        localStorage.setItem(SEEN_KEY, String(maxId))
      } catch {
        // storage unavailable — badge simply resets on reload
      }
      setSeen(maxId)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Notifications${badge ? ` (${badge})` : ""}`}
        title="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-accent-soft hover:text-accent"
      >
        <Bell className="h-5 w-5" strokeWidth={1.9} />
        {badge > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[75vh] overflow-y-auto rounded-2xl border border-line bg-surface shadow-card-hover sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-96">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
          </div>

          <p className="px-4 pt-3 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Current conditions</p>
          {alerts.length ? (
            <ul className="divide-y divide-line">
              {alerts.map((a) => (
                <NotificationItem key={a.key} {...a} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-ink-soft">No active alerts.</p>
          )}

          {isAdmin && (
            <>
              <p className="border-t border-line px-4 pt-3 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
                Telegram notifications
              </p>
              {log.status === "loading" ? (
                <p className="px-4 py-3 text-sm text-ink-faint">Loading…</p>
              ) : log.status === "error" ? (
                <p className="flex items-center gap-2 px-4 py-3 text-sm text-ink-soft">
                  <BellOff className="h-4 w-4" /> Notification history unavailable
                </p>
              ) : log.rows.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink-soft">No Telegram notification sent yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {log.rows.map((r) => (
                    <NotificationItem
                      key={r.id}
                      severity={r.delivery_status === "FAILED" ? "ERROR" : r.severity}
                      title={`${r.title}${r.delivery_status === "FAILED" ? " (delivery failed)" : ""}`}
                      description={eventLabel(r)}
                      at={displayTime(r)}
                      unseen={r.id > seen}
                    />
                  ))}
                </ul>
              )}
              <Link to="/admin/telegram" onClick={close} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-accent hover:bg-accent-soft">
                View notification history
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationItem({ severity, title, description, at, unseen }) {
  const tone = SEVERITY_TONE[severity] ?? "neutral"
  return (
    <li className={`px-4 py-3 ${unseen ? "bg-accent-soft" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <StatusBadge tone={tone} size="sm">
          {severity}
        </StatusBadge>
      </div>
      {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
      {at && (
        <p className="mt-1 font-mono text-[11px] text-ink-faint">
          {formatDateTime(at)} · {formatRelative(at)}
        </p>
      )}
    </li>
  )
}
