import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts"
import { useChartPalette } from "../context/ThemeContext.jsx"
import { formatTime, formatDate, formatValue } from "../utils/format.js"

function getDomain(data, nonNegative) {
  const values = data.flatMap((d) => [d.raw, d.filtered]).filter((v) => v !== null)
  if (!values.length) return [0, 1]
  // loop instead of Math.min(...values): long histories exceed the argument limit
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min
  const pad = span > 0 ? span * 0.2 : Math.max(Math.abs(max) * 0.05, 0.5)
  return [nonNegative ? Math.max(0, min - pad) : min - pad, max + pad]
}

function ChartTooltip({ active, payload, unit, decimals, colors }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const rows = [
    { label: "Filtered (Kalman)", value: point.filtered, color: colors.filtered },
    { label: "Raw sensor", value: point.raw, color: colors.raw },
  ]
  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface px-3 py-2 shadow-card-hover">
      <p className="font-mono text-[11px] text-ink-faint">
        {formatDate(point.t)} · {formatTime(point.t)} WITA
      </p>
      {rows.map((row) => (
        <p key={row.label} className="mt-1 flex items-center gap-2 text-xs text-ink-soft">
          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: row.color }} />
          {row.label}
          <span className="ml-auto font-mono font-semibold text-ink font-tabular">
            {formatValue(row.value, decimals)} {unit}
          </span>
        </p>
      ))}
    </div>
  )
}

export function SeriesLegend({ className = "" }) {
  const { series } = useChartPalette()
  return (
    <div className={`flex items-center gap-4 text-xs font-medium text-ink-soft ${className}`}>
      <span className="flex items-center gap-2">
        <span className="h-[3px] w-5 rounded-full" style={{ backgroundColor: series.filtered }} />
        Filtered (Kalman)
      </span>
      <span className="flex items-center gap-2">
        <span className="h-[1.5px] w-5 rounded-full" style={{ backgroundColor: series.raw }} />
        Raw sensor
      </span>
    </div>
  )
}

// Raw vs Kalman-filtered line chart for one parameter. `data` is ordered
// oldest → newest: [{ t, raw, filtered }]. `references` are optional
// horizontal guide values (e.g. the pH 6.5 / 8.5 bounds used by the app);
// a guide outside the plotted value range is not drawn, so it never
// flattens the curves.
export default function RawFilteredChart({ data, parameter, height = 220, references = [] }) {
  const c = useChartPalette()
  const domain = getDomain(data, parameter.nonNegative)
  const span = domain[1] - domain[0]
  const tickDecimals = span < 10 ** -parameter.decimals * 5 ? parameter.decimals + 1 : parameter.decimals
  const timeSpan = data.length ? data[data.length - 1].t - data[0].t : 0
  const multiDay = timeSpan > 24 * 3600_000
  const tickFormatter = (t) => (multiDay ? formatDate(t).slice(0, 6) : formatTime(t).slice(0, 5))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={c.grid} strokeDasharray="3 5" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={tickFormatter}
          tick={{ fontSize: 11, fill: c.tick, fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false}
          axisLine={{ stroke: c.axis }}
          minTickGap={48}
        />
        <YAxis
          domain={domain}
          tickFormatter={(v) => v.toFixed(tickDecimals)}
          tick={{ fontSize: 11, fill: c.tick, fontFamily: "JetBrains Mono, monospace" }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickCount={5}
        />
        {references.map((r) => (
          <ReferenceLine
            key={r.value}
            y={r.value}
            stroke={c.reference}
            strokeDasharray="6 4"
            ifOverflow="discard"
            label={{ value: r.label, position: "insideTopRight", fill: c.tick, fontSize: 10 }}
          />
        ))}
        <Tooltip
          content={<ChartTooltip unit={parameter.unit} decimals={parameter.decimals} colors={c.series} />}
          cursor={{ stroke: c.axis, strokeWidth: 1 }}
        />
        <Line
          name="Raw"
          type="linear"
          dataKey="raw"
          stroke={c.series.raw}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          name="Filtered"
          type="monotone"
          dataKey="filtered"
          stroke={c.series.filtered}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4.5, stroke: c.surface, strokeWidth: 2 }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
