import { Fragment, useEffect, useState } from "react"
import { ArrowDown, ArrowRight, Cpu, Database, LayoutDashboard, Radio, Send, Sigma, Workflow, Zap } from "lucide-react"
import { Panel, PanelTitle } from "./Section.jsx"
import { StatusDot } from "./StatusBadge.jsx"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { useLiveState } from "../hooks/useAquaSense.js"
import { fetchSystem } from "../services/api.js"
import { getComponentStatus } from "../utils/systemStatus.js"
import { toneOf } from "../utils/tone.js"
import { DEFAULT_DEVICE_ID } from "../config.js"
import { formatDuration } from "../utils/format.js"

const STATUS_ICON = { good: "🟢", warning: "🟡", danger: "🔴", neutral: "⚪" }

// Admin-only runtime details (Telegram delivery, pipeline counters), polled.
// eslint-disable-next-line react-refresh/only-export-components
export function useSystemDetails(enabled, intervalMs = 30_000) {
  const [state, setState] = useState({ status: enabled ? "loading" : "disabled", data: null, error: null })
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const load = () =>
      fetchSystem()
        .then((data) => !cancelled && setState({ status: "ok", data, error: null }))
        .catch((err) => !cancelled && setState((prev) => ({ ...prev, status: prev.data ? "ok" : "error", error: err.message })))
    load()
    const id = setInterval(load, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, intervalMs])
  return state
}

// eslint-disable-next-line react-refresh/only-export-components
export function useComponentStatus() {
  const { isAdmin } = useAuth()
  const { health, wsStatus, latest } = useMonitoring()
  const { live, now } = useLiveState(5000)
  const system = useSystemDetails(isAdmin)
  return { status: getComponentStatus({ health, wsStatus, latest, live, now, system: system.data }), system, live }
}

export function StatusLabel({ status, className = "" }) {
  const t = toneOf(status.tone)
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${t.text} ${className}`}>
      <StatusDot tone={status.tone} />
      <span className="sr-only">{STATUS_ICON[status.tone]}</span>
      {status.label}
    </span>
  )
}

const COMPONENTS = [
  { key: "esp32", name: "ESP32", role: "Sensor node (pH · TDS · turbidity)", icon: Cpu },
  { key: "mqtt", name: "MQTT", role: "Mosquitto broker → Node-RED", icon: Radio },
  { key: "nodered", name: "Node-RED", role: "Validation · Kalman · classification", icon: Workflow },
  { key: "mysql", name: "MySQL", role: "Persistent monitoring data", icon: Database },
  { key: "websocket", name: "WebSocket", role: "Realtime push to this dashboard", icon: Zap },
  { key: "telegram", name: "Telegram", role: "Status-change notifications", icon: Send },
]

// Grid of component statuses (dashboard + system integration page).
export function SystemStatusGrid({ status }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card sm:grid-cols-2 xl:grid-cols-3">
      {COMPONENTS.map(({ key, name, role, icon: Icon }) => (
        <div key={key} className="min-w-0 bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
              {name}
            </p>
            <StatusLabel status={status[key]} />
          </div>
          {status[key].note && (
            <p className="mt-1.5 text-xs break-words text-ink-faint" title={role}>
              {status[key].note}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ESP32 → MQTT → Node-RED → Kalman → MySQL → Dashboard → Telegram
export function PipelineDiagram({ status, hasFilteredData }) {
  const nodes = [
    { title: "ESP32", subtitle: "pH · TDS · turbidity", icon: Cpu, status: status.esp32 },
    { title: "MQTT Mosquitto", subtitle: "aquasense/borikamase/water", icon: Radio, status: status.mqtt },
    { title: "Node-RED", subtitle: "Validation & processing", icon: Workflow, status: status.nodered },
    {
      title: "Kalman Filter",
      subtitle: "Noise reduction (Node-RED)",
      icon: Sigma,
      status: hasFilteredData ? { label: "Output present", tone: "good" } : { label: "Unknown", tone: "neutral" },
    },
    { title: "MySQL", subtitle: "Storage", icon: Database, status: status.mysql },
    { title: "AquaSense Dashboard", subtitle: "REST + WebSocket", icon: LayoutDashboard, status: status.websocket },
    { title: "Telegram", subtitle: "Notification", icon: Send, status: status.telegram },
  ]
  return (
    <ol className="flex flex-col gap-1.5 xl:flex-row xl:items-stretch" aria-label="Data pipeline">
      {nodes.map((n, i) => (
        <Fragment key={n.title}>
          <li className="flex flex-1 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3 xl:flex-col xl:text-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
              <n.icon className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{n.title}</p>
              <p className="text-[11px] leading-snug break-words text-ink-faint">{n.subtitle}</p>
            </div>
            <StatusLabel status={n.status} />
          </li>
          {i < nodes.length - 1 && (
            <li aria-hidden="true" className="flex items-center justify-center text-line-strong">
              <ArrowDown className="h-4 w-4 xl:hidden" />
              <ArrowRight className="hidden h-4 w-4 xl:block" />
            </li>
          )}
        </Fragment>
      ))}
    </ol>
  )
}

export function SystemInformation() {
  const { config, latest } = useMonitoring()
  const rows = [
    ["Device ID", latest?.device_id ?? config?.device_id ?? DEFAULT_DEVICE_ID],
    ["Location", config?.location ?? "—"],
    ["Sampling interval", config ? formatDuration(config.sampling_interval_seconds) : "—"],
    ["Freshness threshold (LIVE)", config ? formatDuration(config.freshness_threshold_seconds) : "—"],
    ["Parameters", config ? config.parameters.join(" • ") : "—"],
    ["Processing", config?.processing ?? "—"],
    ["Communication", config ? `${config.communication} (${config.mqtt_topic})` : "—"],
    ["Backend", config?.backend ?? "—"],
    ["Database", config?.database ?? "—"],
    ["Frontend", config?.frontend ?? "React"],
    ["Realtime", config?.realtime ?? "—"],
    ["Timezone", config ? `${config.timezone} (${config.timezone_label}, UTC${config.utc_offset})` : "—"],
  ]
  return (
    <Panel className="p-5">
      <PanelTitle>System information</PanelTitle>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
            <dt className="text-sm text-ink-soft">{k}</dt>
            <dd className="text-right text-sm font-semibold break-words text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
