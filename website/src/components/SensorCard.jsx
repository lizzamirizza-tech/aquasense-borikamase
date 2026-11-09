import { useMemo } from "react"
import GaugeWidget, { zonesFor } from "./GaugeWidget.jsx"
import StatusBadge from "./StatusBadge.jsx"
import { Skeleton } from "./EmptyState.jsx"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { SERIES_COLOR } from "../constants/parameters.js"
import { formatValue } from "../utils/format.js"
import { getSensorHealth, HEALTH_META } from "../utils/sensorHealth.js"
import { sensorStability } from "../utils/statistics.js"
import { STABILITY_WINDOW } from "../config.js"

const STABILITY_META = {
  stable: { label: "Stable", tone: "good", icon: "✓" },
  moderate: { label: "Moderate", tone: "warning", icon: "〰" },
  fluctuating: { label: "Fluctuating", tone: "danger", icon: "⚠" },
}

// One parameter: gauge (filtered), raw value, sensor health and a short-term
// fluctuation indicator. All values come from the backend readings.
export default function SensorCard({ parameter, fresh }) {
  const { latest, readings, config, initialLoading } = useMonitoring()
  const Icon = parameter.icon
  const rule = config?.thresholds?.rules?.find((r) => r.parameter === parameter.key)
  const zones = useMemo(() => zonesFor(parameter, rule), [parameter, rule])
  const health = getSensorHealth(latest, parameter, fresh, rule)
  const hm = HEALTH_META[health.state]
  const stability = useMemo(() => sensorStability(readings, parameter, { window: STABILITY_WINDOW }), [readings, parameter])

  const raw = latest?.[parameter.rawKey] ?? null
  const filtered = latest?.[parameter.filteredKey] ?? null

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
            <Icon className="h-5 w-5 text-accent" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-tight">
            <h3 className="text-base font-semibold text-ink">{parameter.label}</h3>
            <p className="truncate text-xs text-ink-faint">{parameter.name}</p>
          </div>
        </div>
        <StatusBadge tone={hm.tone} size="sm" icon={hm.icon} title={health.note}>
          {hm.label}
        </StatusBadge>
      </header>

      <div className="mt-3">
        {initialLoading ? (
          <div className="flex flex-col items-center gap-2 py-6" role="status">
            <Skeleton className="h-24 w-44 rounded-t-full" />
            <span className="text-xs text-ink-faint">Loading…</span>
          </div>
        ) : (
          <GaugeWidget
            value={filtered}
            min={parameter.gauge.min}
            max={parameter.gauge.max}
            zones={zones}
            decimals={parameter.decimals}
            unit={parameter.unit}
            label={parameter.label}
          />
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
            <span className="h-[3px] w-3 rounded-full" style={{ backgroundColor: SERIES_COLOR.filtered }} aria-hidden="true" />
            Filtered
          </dt>
          <dd className="mt-0.5 font-mono font-semibold text-ink font-tabular">
            {formatValue(filtered, parameter.decimals)} {filtered !== null && parameter.unit}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
            <span className="h-[2px] w-3 rounded-full" style={{ backgroundColor: SERIES_COLOR.raw }} aria-hidden="true" />
            Raw
          </dt>
          <dd className="mt-0.5 font-mono font-semibold text-ink font-tabular">
            {formatValue(raw, parameter.decimals)} {raw !== null && parameter.unit}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="sr-only">Stability</dt>
          <dd
            className="flex flex-wrap items-center gap-2 text-xs text-ink-soft"
            title="Fluctuation: mean absolute change of RAW values between consecutive readings (last 10, within 30 min). Not MAE/RMSE."
          >
            {stability?.status ? (
              <>
                <StatusBadge tone={STABILITY_META[stability.status].tone} size="sm" icon={STABILITY_META[stability.status].icon}>
                  {STABILITY_META[stability.status].label}
                </StatusBadge>
                <span className="font-mono font-tabular">
                  ±{formatValue(stability.fluctuation, parameter.decimals + 1)} {parameter.unit}
                </span>
              </>
            ) : (
              <span className="text-ink-faint">—</span>
            )}
          </dd>
        </div>
      </dl>
    </article>
  )
}
