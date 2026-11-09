import { CircleCheck, CircleHelp, OctagonAlert, RefreshCw, TriangleAlert, Unplug } from "lucide-react"
import { Button, Panel } from "./Section.jsx"
import StatusBadge, { SensorStatusBadge, SessionBadge } from "./StatusBadge.jsx"
import { Skeleton } from "./EmptyState.jsx"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { useLiveState } from "../hooks/useAquaSense.js"
import { CLASSIFICATION_NOTE, QUALITY_TONE, SCOPE_DISCLAIMER } from "../utils/waterQuality.js"
import { formatDateTime, formatRelative } from "../utils/format.js"
import { toneOf } from "../utils/tone.js"
import { DEFAULT_DEVICE_ID } from "../config.js"

const ICON = { GOOD: CircleCheck, WARNING: TriangleAlert, DANGER: OctagonAlert }
const LABEL_ICON = { GOOD: "✓", WARNING: "⚠", DANGER: "🚨" }

// "CURRENT WATER QUALITY" — the backend's classification of the newest
// reading, with monitoring state and last update. When data stops, the last
// known reading stays visible and is labelled as such.
export default function CurrentQuality() {
  const { latest, initialLoading, recentState, config, refresh } = useMonitoring()
  const { live, now } = useLiveState(1000)

  if (!latest) {
    if (initialLoading) {
      return (
        <Panel className="p-6 sm:p-8" aria-busy="true">
          <p className="text-xs font-semibold tracking-[0.12em] text-ink-faint uppercase">Current water quality</p>
          <Skeleton className="mt-4 h-14 w-56" />
          <Skeleton className="mt-4 h-4 w-full max-w-md" />
          <p className="mt-3 text-sm text-ink-faint">Fetching latest data…</p>
        </Panel>
      )
    }
    const unreachable = live.state === "offline"
    const Icon = unreachable ? Unplug : CircleHelp
    return (
      <Panel className="flex flex-col items-center px-6 py-12 text-center">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink-faint uppercase">Current water quality</p>
        <Icon className="mt-5 h-9 w-9 text-ink-faint" strokeWidth={1.6} aria-hidden="true" />
        <p className="mt-3 text-lg font-semibold text-ink">{unreachable ? "Monitoring server unavailable" : "Waiting for data"}</p>
        <p className="mt-1 max-w-md text-sm text-ink-soft">
          {unreachable ? "Unable to load monitoring data. Please try again." : recentState.error || "No reading has been stored yet."}
        </p>
        <Button icon={RefreshCw} className="mt-5" onClick={refresh}>
          Retry
        </Button>
      </Panel>
    )
  }

  const quality = latest.water_quality
  const t = toneOf(quality ? QUALITY_TONE[quality] : "neutral")
  const Icon = ICON[quality] ?? CircleHelp
  const stale = live.state !== "live"

  return (
    <Panel className={`overflow-hidden border-l-4 ${quality ? t.border : ""}`}>
      <div className="grid lg:grid-cols-[1.5fr_1fr]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-[0.12em] text-ink-faint uppercase">
              {stale ? "Last known water quality" : "Current water quality"}
            </p>
            <StatusBadge tone={live.tone} pulse={live.state === "live"} title={live.description}>
              {live.label}
            </StatusBadge>
          </div>
          <div className="mt-4 flex items-center gap-3 sm:gap-4">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16 ${t.bg}`}>
              <Icon className={`h-8 w-8 sm:h-9 sm:w-9 ${t.text}`} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <p className={`text-5xl font-extrabold tracking-tight sm:text-6xl ${t.text}`}>
              <span className="sr-only">{LABEL_ICON[quality]} </span>
              {quality ?? "UNKNOWN"}
            </p>
          </div>
          <p className="mt-4 max-w-xl text-xs leading-relaxed text-ink-faint" title={SCOPE_DISCLAIMER}>
            {CLASSIFICATION_NOTE}
          </p>
        </div>

        <dl className="grid grid-cols-2 content-center gap-x-5 gap-y-5 border-t border-line bg-surface-alt p-5 sm:p-7 lg:border-t-0 lg:border-l">
          <Fact label={stale ? "Last known reading" : "Last update"} wide>
            <span className="font-mono text-base font-semibold text-ink font-tabular sm:text-lg">{formatDateTime(latest.timestamp)}</span>
            <span className="mt-0.5 block text-xs text-ink-soft">{formatRelative(latest.timestamp, now)}</span>
          </Fact>
          <Fact label="Device ID">
            <span className="font-mono text-[13px] break-all">{latest.device_id ?? config?.device_id ?? DEFAULT_DEVICE_ID}</span>
          </Fact>
          <Fact label="Session">
            <SessionBadge session={latest.session} />
          </Fact>
          <Fact label="Sensor status">
            <SensorStatusBadge status={latest.sensor_status} />
          </Fact>
          <Fact label="Monitoring state">
            <span className={`text-sm font-semibold ${toneOf(live.tone).text}`}>{live.short}</span>
          </Fact>
        </dl>
      </div>

      {stale && (
        <div className={`flex items-start gap-2 border-t px-5 py-3 text-sm sm:px-7 ${live.state === "offline" ? "border-danger-border bg-danger-bg text-danger" : "border-warning-border bg-warning-bg text-warning"}`}>
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{live.state === "offline" ? "Server tidak terjangkau" : "Belum ada data baru"} · menampilkan data terakhir</span>
        </div>
      )}
    </Panel>
  )
}

function Fact({ label, children, wide }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{children}</dd>
    </div>
  )
}
