import { useMemo, useState } from "react"
import { ResponsiveContainer, LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Label } from "recharts"
import { Activity, CalendarDays, ChartColumn, ChartLine, ChevronDown, ImageDown, TriangleAlert } from "lucide-react"
import { Alert, Button, Panel } from "./Section.jsx"
import EmptyState, { LoadingBlock } from "./EmptyState.jsx"
import { SectionHeading } from "./KalmanEvaluation.jsx"
import { PARAMETER_UNIT as UNIT } from "../constants/evaluation.js"
import { useChartPalette, useTheme } from "../context/ThemeContext.jsx"
import { CHART_PALETTE, PARAMETERS } from "../constants/parameters.js"
import { exportChartPng, PNG_CHART_BOX } from "../utils/chartExport.js"
import { formatDate, formatDateTime, formatTime, formatValue } from "../utils/format.js"

// Kalman Filter Visualization: RAW vs FILTERED of one parameter for the
// newest N readings of the selected dates and session (N from the slider).
// Points are stored readings only — RAW and FILTERED of a point come from the
// same record; nothing is interpolated or simulated. The slider only changes
// what is drawn; the evaluation above always uses every reading.

const CHART_HEIGHT = 420
const MIN_READINGS = 10
const DEFAULT_READINGS = 120
const SERIES = { raw: "RAW", filtered: "FILTERED" }
// RAW is drawn in gray, FILTERED in the AquaSense teal of the active theme.
const RAW_GRAY = { dark: "#8a929c", light: "#9aa3ad" }
const CHART_TYPES = [
  { id: "line", icon: ChartLine, aria: "Line chart" },
  { id: "bar", icon: ChartColumn, aria: "Bar chart" },
]

const pad = (n) => String(n).padStart(2, "0")
const sessionLabel = (s) => `${s.name} (${pad(s.startHour)}:00–${pad(s.endHour - 1)}:59)`
const axisTitle = (p) => (p.key === "ph" ? "pH" : `${p.label} (${UNIT[p.key]})`)
const dayLabel = (key) => formatDate(`${key}T00:00:00+08:00`)

function toPoints(rows, parameter) {
  const points = []
  for (const r of rows) {
    const raw = r[parameter.rawKey]
    const filtered = r[parameter.filteredKey]
    if (raw === null && filtered === null) continue
    points.push({ i: points.length, t: r.timestamp.getTime(), raw, filtered })
  }
  return points
}

// Rounded axis bounds (step 1, 2, 2.5 or 5 × 10^n) for readable ticks.
function getAxis(points, nonNegative) {
  let min = Infinity
  let max = -Infinity
  for (const p of points) {
    for (const v of [p.raw, p.filtered]) {
      if (v === null) continue
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (min === Infinity) return { domain: [0, 1], ticks: [0, 1], decimals: 0 }
  if (max - min < 1e-9) {
    min -= Math.max(Math.abs(min) * 0.05, 0.5)
    max += Math.max(Math.abs(max) * 0.05, 0.5)
  }
  const rough = (max - min) / 5
  const mag = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= rough)
  let lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  if (nonNegative) lo = Math.max(0, lo)
  const ticks = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)))
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9) + (step / mag === 2.5 ? 1 : 0))
  return { domain: [lo, hi], ticks, decimals }
}

function ChartTooltip({ active, payload, parameter, colors }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface px-3 py-2 shadow-card-hover">
      <p className="font-mono text-[11px] text-ink-faint">
        {formatDate(point.t)} · {formatTime(point.t)} WITA
      </p>
      {["raw", "filtered"].map((k) => (
        <p key={k} className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: colors[k] }} />
          {SERIES[k]}
          <span className="ml-auto font-mono font-semibold text-ink font-tabular">
            {formatValue(point[k], parameter.decimals)} {UNIT[parameter.key]}
          </span>
        </p>
      ))}
    </div>
  )
}

function Legend({ colors, type }) {
  return (
    <div className="flex items-center gap-4 text-xs font-medium text-ink-soft">
      {["raw", "filtered"].map((k) => (
        <span key={k} className="flex items-center gap-2">
          {type === "bar" ? (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors[k] }} />
          ) : (
            <span className={`${k === "raw" ? "h-[2px]" : "h-[3px]"} w-5 rounded-full`} style={{ backgroundColor: colors[k] }} />
          )}
          {SERIES[k]}
        </span>
      ))}
    </div>
  )
}

// The chart element (direct child of a ResponsiveContainer, or drawn at a
// fixed size for the PNG export).
function renderChart({ points, parameter, palette, colors, type, width, height, font, scale = 1, tooltip = false }) {
  const axis = getAxis(points, parameter.nonNegative)
  const multiDay = points.length > 1 && formatDate(points[0].t) !== formatDate(points[points.length - 1].t)
  const byIndex = new Map(points.map((p) => [p.i, p]))
  const tickFormatter = (i) => {
    const p = byIndex.get(Number(i))
    if (!p) return ""
    return multiDay ? `${formatDate(p.t).slice(0, 6)} ${formatTime(p.t).slice(0, 5)}` : formatTime(p.t).slice(0, 5)
  }
  const tick = { fontSize: font.size, fill: palette.tick, fontFamily: font.family }
  const label = { fontSize: font.labelSize, fill: palette.tick, fontFamily: font.family, fontWeight: 600 }
  const Chart = type === "bar" ? BarChart : LineChart

  return (
    <Chart
      data={points}
      width={width}
      height={height}
      margin={{ top: 8 * scale, right: (multiDay ? 48 : 24) * scale, bottom: 4 * scale, left: 16 * scale }}
      barGap={0}
      barCategoryGap={points.length > 200 ? 0 : "20%"}
    >
      <CartesianGrid stroke={palette.grid} strokeDasharray="3 5" vertical={false} />
      <XAxis
        dataKey="i"
        type={type === "bar" ? "category" : "number"}
        domain={type === "bar" ? undefined : ["dataMin", "dataMax"]}
        allowDecimals={false}
        interval="preserveStartEnd"
        tickFormatter={tickFormatter}
        tick={tick}
        tickLine={false}
        axisLine={{ stroke: palette.axis }}
        minTickGap={(multiDay ? 72 : 48) * scale}
        height={50 * scale}
      >
        <Label value="Time (WITA)" position="insideBottom" offset={6 * scale} style={label} />
      </XAxis>
      <YAxis
        domain={axis.domain}
        ticks={axis.ticks}
        allowDataOverflow
        tickFormatter={(v) => v.toFixed(axis.decimals)}
        tick={tick}
        tickLine={false}
        axisLine={false}
        width={64 * scale}
      >
        <Label value={axisTitle(parameter)} angle={-90} position="insideLeft" offset={0} style={{ ...label, textAnchor: "middle" }} />
      </YAxis>
      {tooltip && (
        <Tooltip
          content={<ChartTooltip parameter={parameter} colors={colors} />}
          cursor={type === "bar" ? { fill: palette.grid } : { stroke: palette.axis, strokeWidth: 1 }}
        />
      )}
      {type === "bar"
        ? ["raw", "filtered"].map((k) => (
            <Bar key={k} name={SERIES[k]} dataKey={k} fill={colors[k]} maxBarSize={18 * scale} isAnimationActive={false} />
          ))
        : [
            <Line key="raw" name={SERIES.raw} type="linear" dataKey="raw" stroke={colors.raw} strokeWidth={1.5 * scale} dot={false}
              activeDot={tooltip ? { r: 4, stroke: palette.surface, strokeWidth: 2 } : false} connectNulls isAnimationActive={false} />,
            <Line key="filtered" name={SERIES.filtered} type="monotone" dataKey="filtered" stroke={colors.filtered} strokeWidth={2.5 * scale} dot={false}
              activeDot={tooltip ? { r: 4.5, stroke: palette.surface, strokeWidth: 2 } : false} connectNulls isAnimationActive={false} />,
          ]}
    </Chart>
  )
}

const groupClass = "inline-flex rounded-lg border border-line-strong p-0.5"
const optionClass = (active) =>
  `min-h-8 rounded-md px-3.5 text-xs font-semibold transition-colors ${active ? "bg-accent text-on-accent" : "text-ink-soft hover:text-accent"}`
const fieldClass =
  "min-h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
const fieldLabel = "mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft"

export default function KalmanVisualization({ dataset, filters, onFiltersChange, sessions, invalidRange }) {
  const palette = useChartPalette()
  const { theme } = useTheme()
  const colors = { raw: RAW_GRAY[theme], filtered: palette.series.filtered }
  const [paramKey, setParamKey] = useState(PARAMETERS[0].key)
  const [type, setType] = useState("line")
  const [requested, setRequested] = useState(DEFAULT_READINGS)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  const parameter = PARAMETERS.find((p) => p.key === paramKey)
  const available = dataset.status === "ok" ? dataset.rows.length : 0
  const min = Math.min(MIN_READINGS, available)
  const count = Math.max(min, Math.min(requested, available)) // never more than available
  const points = useMemo(
    () => (dataset.status === "ok" ? toPoints(dataset.rows.slice(-count), parameter) : []),
    [dataset.status, dataset.rows, count, parameter],
  )

  const sessionText = filters.session === "all" ? "All Sessions" : sessionLabel(sessions.find((s) => s.name === filters.session) ?? { name: filters.session, startHour: 0, endHour: 1 })
  const first = points[0]
  const last = points[points.length - 1]
  const rangeText = first ? `${formatDateTime(first.t)} – ${formatDateTime(last.t)} WITA` : ""

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      const light = CHART_PALETTE.light
      const lightColors = { raw: RAW_GRAY.light, filtered: light.series.filtered }
      await exportChartPng({
        element: renderChart({
          points,
          parameter,
          palette: light,
          colors: lightColors,
          type,
          width: PNG_CHART_BOX.width,
          height: PNG_CHART_BOX.height,
          font: { family: "Arial, Helvetica, sans-serif", size: 22, labelSize: 26 },
          scale: 2,
        }),
        ready: (svg) =>
          type === "bar" ? svg.querySelectorAll(".recharts-bar-rectangle").length > 0 : svg.querySelectorAll(".recharts-line-curve").length >= 2,
        title: `${parameter.label} Measurement — RAW vs FILTERED`,
        subtitle: `${dayLabel(filters.from)} – ${dayLabel(filters.to)} · ${sessionText} · ${count} readings · ${type === "bar" ? "Bar" : "Line"} chart · ${rangeText}`,
        legend: ["raw", "filtered"].map((k) => ({ label: SERIES[k], color: lightColors[k], shape: type === "bar" ? "box" : "line", lineWidth: k === "raw" ? 3 : 5 })),
        caption: `Source: AquaSense Borikamase measurements (MySQL) · Kalman Filter in Node-RED · Exported ${formatDateTime(new Date())} WITA`,
        filename: `AquaSense_Kalman_${parameter.label}_${filters.from}_to_${filters.to}_${filters.session === "all" ? "AllSessions" : filters.session}_${count}_${type}.png`,
      })
    } catch (err) {
      setExportError(`Export failed. ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <section>
      <SectionHeading title="Kalman Filter Visualization" subtitle="Explore raw and filtered sensor measurements." />
      <Panel className="p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <label className="block">
            <span className={fieldLabel}>
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Start Date
            </span>
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => onFiltersChange({ from: e.target.value })} className={fieldClass} />
          </label>
          <label className="block">
            <span className={fieldLabel}>
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> End Date
            </span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => onFiltersChange({ to: e.target.value })} className={fieldClass} />
          </label>
        </div>
        <label className="mt-3 block sm:max-w-md">
          <span className={fieldLabel}>Observation Session</span>
          <span className="relative block">
            <select value={filters.session} onChange={(e) => onFiltersChange({ session: e.target.value })} className={`${fieldClass} appearance-none pr-9`}>
              <option value="all">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.name} value={s.name}>
                  {sessionLabel(s)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          </span>
        </label>
        <p className="mt-2 text-[11px] text-ink-faint">Dates in WITA (UTC+8), inclusive. Only readings from the observation sessions are used.</p>

        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className={`${groupClass} self-start`} role="tablist" aria-label="Parameter">
            {PARAMETERS.map((p) => (
              <button key={p.key} type="button" role="tab" aria-selected={paramKey === p.key} onClick={() => setParamKey(p.key)} className={optionClass(paramKey === p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className={groupClass} role="group" aria-label="Chart type">
              {CHART_TYPES.map(({ id, icon: Icon, aria }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={aria}
                  aria-pressed={type === id}
                  onClick={() => setType(id)}
                  className={`flex min-h-8 w-9 items-center justify-center rounded-md transition-colors ${type === id ? "bg-accent text-on-accent" : "text-ink-faint hover:text-accent"}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
              ))}
            </div>
            <Button size="sm" icon={ImageDown} onClick={handleExport} disabled={invalidRange || dataset.status !== "ok" || points.length < 2 || exporting}>
              {exporting ? "Exporting…" : "Export PNG"}
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink">{parameter.label} Measurement</h3>
            <p className="mt-0.5 text-xs text-ink-faint">
              {parameter.name} · unit {UNIT[parameter.key]}
              {rangeText && ` · ${rangeText}`}
            </p>
          </div>
          <Legend colors={colors} type={type} />
        </div>

        {exportError && (
          <Alert tone="danger" icon={TriangleAlert} className="mt-4">
            {exportError}
          </Alert>
        )}

        <div className="mt-4">
          {invalidRange ? (
            <EmptyState icon={TriangleAlert} title="Invalid date range" description="Start Date must not be after End Date." className="h-[420px]" />
          ) : dataset.status === "loading" ? (
            <LoadingBlock label="Loading readings from the database…" className="h-[420px] justify-center" />
          ) : dataset.status === "error" ? (
            <EmptyState icon={TriangleAlert} tone="error" title="Chart data could not be loaded" description={dataset.error} className="h-[420px]" />
          ) : points.length >= 2 ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              {renderChart({
                points,
                parameter,
                palette,
                colors,
                type,
                font: { family: "JetBrains Mono, monospace", size: 11, labelSize: 11 },
                tooltip: true,
              })}
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Activity} title="No readings in the selected dates and session" className="h-[420px]" />
          )}
        </div>

        <div className="mt-5 rounded-xl border border-line bg-surface-alt px-4 py-4 sm:px-5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="kalman-readings" className="text-sm font-semibold text-ink">
              Number of Readings
            </label>
            <output htmlFor="kalman-readings" className="font-mono text-3xl font-bold text-accent font-tabular" aria-live="polite">
              {available ? count : "—"}
            </output>
          </div>
          <input
            id="kalman-readings"
            type="range"
            min={min || 0}
            max={available || 0}
            step={1}
            value={available ? count : 0}
            disabled={!available || available <= min}
            onChange={(e) => setRequested(Number(e.target.value))}
            className="mt-3 h-2 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
          />
          <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
            <span>{min || 0}</span>
            <span>Max</span>
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">Showing the newest readings of the selected period. The slider only changes the chart, not the evaluation.</p>
        </div>
      </Panel>
    </section>
  )
}
