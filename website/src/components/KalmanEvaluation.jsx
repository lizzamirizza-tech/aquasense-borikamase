import { useMemo } from "react"
import { RefreshCw, TriangleAlert } from "lucide-react"
import { Alert, Panel } from "./Section.jsx"
import { LoadingBlock } from "./EmptyState.jsx"
import { PARAMETERS } from "../constants/parameters.js"
import { PARAMETER_UNIT as UNIT, SENSOR_ACCURACY } from "../constants/evaluation.js"
import { computeFilterPerformance } from "../utils/filterPerformance.js"
import { formatDateTime } from "../utils/format.js"

// display decimals of SD / fluctuation values per parameter
const DECIMALS = { ph: 4, tds: 3, turbidity: 4 }

const th = "py-2.5 pr-4 text-right font-semibold"
const headRow = "border-b border-line text-left text-[11px] tracking-wider text-ink-faint uppercase"
const bodyRow = "border-b border-line last:border-0"

export function SectionHeading({ title, subtitle, badge, note }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {badge}
      </div>
      {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
      {note && <p className="mt-1 text-xs text-ink-faint">{note}</p>}
    </div>
  )
}

function ParameterName({ label, unit }) {
  return (
    <td className="py-3 pr-4 font-sans font-semibold text-ink">
      {label} <span className="font-normal text-ink-faint">({unit})</span>
    </td>
  )
}

export function SensorAccuracyEvaluation() {
  return (
    <section>
      <SectionHeading title="Sensor Accuracy Evaluation" subtitle="Evaluation of sensor measurements against reference instruments." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SENSOR_ACCURACY.map((p) => (
          <Panel key={p.key} className="px-5 py-4">
            <p className="text-sm font-semibold text-ink-soft">{p.label}</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-accent font-tabular">{p.accuracy}</p>
            <p className="mt-0.5 text-xs text-ink-soft">Accuracy</p>
          </Panel>
        ))}
      </div>
      <Panel className="mt-3 p-4 sm:p-5">
        <p className="text-sm font-semibold text-ink">Accuracy Metrics</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className={headRow}>
                <th className="py-2.5 pr-4 font-semibold">Parameter</th>
                <th className={th}>MAE</th>
                <th className="py-2.5 text-right font-semibold">RMSE</th>
              </tr>
            </thead>
            <tbody className="font-mono font-tabular">
              {SENSOR_ACCURACY.map((p) => (
                <tr key={p.key} className={bodyRow}>
                  <ParameterName label={p.label} unit={p.unit} />
                  <td className="py-3 pr-4 text-right text-ink">{p.mae}</td>
                  <td className="py-3 text-right text-ink">{p.rmse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-faint">MAE and RMSE units: pH in pH, TDS in ppm, Turbidity in NTU.</p>
      </Panel>
    </section>
  )
}

const fmt = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—")
const pct = (v) => (typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)}%` : "—")

function MetricTable({ title, columns, rows }) {
  return (
    <Panel className="p-4 sm:p-5">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className={headRow}>
              <th className="py-2.5 pr-4 font-semibold">Parameter</th>
              {columns.map((c, i) => (
                <th key={c} className={i === columns.length - 1 ? "py-2.5 text-right font-semibold" : th}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono font-tabular">
            {rows.map((r) => (
              <tr key={r.key} className={bodyRow}>
                <ParameterName label={r.label} unit={UNIT[r.key]} />
                <td className="py-3 pr-4 text-right text-ink-soft">{r.values[0]}</td>
                <td className="py-3 pr-4 text-right text-ink">{r.values[1]}</td>
                <td className="py-3 text-right font-semibold text-accent">{r.values[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

// Computed from `dataset.rows` — every stored reading of the selected dates
// and sessions (never only the readings drawn in the chart).
export function FilterPerformanceEvaluation({ dataset, invalidRange }) {
  const results = useMemo(
    () => (dataset.status === "ok" ? PARAMETERS.map((p) => ({ p, m: computeFilterPerformance(dataset.rows, p) })) : []),
    [dataset.status, dataset.rows],
  )
  const newest = dataset.rows[dataset.rows.length - 1]
  const empty = dataset.status === "ok" && dataset.rows.length === 0

  return (
    <section>
      <SectionHeading
        title="Filter Performance Evaluation"
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-accent-line bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
            <RefreshCw className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" /> Automatic
          </span>
        }
        subtitle="Evaluation of sensor measurement stability before and after Kalman filtering."
        note="Automatically calculated from incoming RAW and FILTERED sensor readings."
      />
      {invalidRange ? (
        <Alert tone="warning" icon={TriangleAlert}>Start Date must not be after End Date.</Alert>
      ) : dataset.status === "loading" ? (
        <Panel className="p-5">
          <LoadingBlock label="Calculating from the database…" />
        </Panel>
      ) : dataset.status === "error" ? (
        <Alert tone="danger" icon={TriangleAlert}>Readings could not be loaded. {dataset.error}</Alert>
      ) : empty ? (
        <Alert tone="info" icon={TriangleAlert}>No RAW / FILTERED readings in the selected dates and session.</Alert>
      ) : (
        <div className="space-y-3">
          <MetricTable
            title="Standard Deviation"
            columns={["SD Raw", "SD Filtered", "SD Reduction"]}
            rows={results.map(({ p, m }) => ({
              key: p.key,
              label: p.label,
              values: [fmt(m.sdRaw, DECIMALS[p.key]), fmt(m.sdFiltered, DECIMALS[p.key]), pct(m.sdReduction)],
            }))}
          />
          <MetricTable
            title="Measurement Fluctuation"
            columns={["Fluctuation Raw", "Fluctuation Filtered", "Fluctuation Reduction"]}
            rows={results.map(({ p, m }) => ({
              key: p.key,
              label: p.label,
              values: [fmt(m.fluctRaw, DECIMALS[p.key]), fmt(m.fluctFiltered, DECIMALS[p.key]), pct(m.fluctReduction)],
            }))}
          />
          {newest && (
            <p className="text-[11px] text-ink-faint">Calculated from the database · includes readings up to {formatDateTime(newest.timestamp)} WITA</p>
          )}
        </div>
      )}
    </section>
  )
}
