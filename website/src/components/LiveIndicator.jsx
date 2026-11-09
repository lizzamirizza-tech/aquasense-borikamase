import StatusBadge from "./StatusBadge.jsx"
import { useLiveState } from "../hooks/useAquaSense.js"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { formatDateTime, formatRelative, formatRelativeShort, ZONE_LABEL } from "../utils/format.js"


// LIVE / WAITING FOR DATA / OFFLINE with the last update. `compact` is the
// mobile header form that stays visible while the menu is closed.
export default function LiveIndicator({ compact = false }) {
  const { latest } = useMonitoring()
  const { live, now } = useLiveState(1000)

  if (compact) {
    return (
      <div className="flex min-w-0 flex-col items-end leading-tight" aria-live="polite">
        <StatusBadge tone={live.tone} size="sm" pulse={live.state === "live"} title={live.description}>
          {live.short}
        </StatusBadge>
        <span className="mt-0.5 truncate text-[10px] text-ink-faint">
          {latest ? `Last update ${formatRelativeShort(latest.timestamp, now)} ago` : "No data yet"}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <StatusBadge tone={live.tone} pulse={live.state === "live"} title={live.description}>
        {live.label}
      </StatusBadge>
      <div className="hidden leading-tight xl:block">
        <p className="text-[11px] text-ink-faint">
          Last update · <span className="font-medium text-ink-soft">{ZONE_LABEL}</span>
        </p>
        <p className="font-mono text-xs text-ink font-tabular">{latest ? formatDateTime(latest.timestamp) : "—"}</p>
      </div>
      <p className="hidden text-xs text-ink-soft md:block xl:hidden">{latest ? formatRelative(latest.timestamp, now) : "No data yet"}</p>
      <p className="hidden text-xs text-ink-soft xl:block">{latest ? formatRelative(latest.timestamp, now) : ""}</p>
    </div>
  )
}
