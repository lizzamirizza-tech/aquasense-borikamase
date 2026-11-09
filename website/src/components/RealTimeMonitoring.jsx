import { useMemo, useState } from "react"
import { Activity, Pause, Play, TriangleAlert } from "lucide-react"
import { Button, Panel } from "./Section.jsx"
import RawFilteredChart, { SeriesLegend } from "./RawFilteredChart.jsx"
import EmptyState, { LoadingBlock } from "./EmptyState.jsx"
import { fieldClass } from "./Filters.jsx"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { PARAMETERS, toSeries } from "../constants/parameters.js"
import { CHART_PERIODS, DEFAULT_PERIOD, useSeries } from "../hooks/useSeries.js"
import { todayKey } from "../utils/dateRange.js"
import { readPrefs } from "../utils/prefs.js"
import { formatCount, formatDateTime, formatValue } from "../utils/format.js"

function ChartCard({ parameter, readings, status, references }) {
  const data = useMemo(() => toSeries(readings, parameter, Infinity), [readings, parameter])
  const last = data[data.length - 1]

  return (
    <Panel className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {parameter.label}
            {parameter.unit && <span className="ml-1 font-normal text-ink-faint">({parameter.unit})</span>}
          </p>
        </div>
        {last && (
          <p className="shrink-0 text-right font-mono text-lg font-semibold text-ink font-tabular">
            {formatValue(last.filtered, parameter.decimals)}
            {parameter.unit && <span className="ml-1 text-xs font-medium text-ink-soft">{parameter.unit}</span>}
          </p>
        )}
      </div>
      <div className="mt-3">
        {status === "loading" ? (
          <LoadingBlock label="Loading chart…" className="h-[210px] justify-center" />
        ) : data.length >= 2 ? (
          <RawFilteredChart data={data} parameter={parameter} height={210} references={references} />
        ) : (
          <EmptyState icon={Activity} title="Tidak ada data pada periode ini" description="Grafik terisi otomatis saat pembacaan baru diterima." className="h-[210px] py-6" />
        )}
      </div>
      {references.length > 0 && (
        <p className="mt-2 text-[11px] text-ink-faint">
          Garis putus-putus: rentang referensi pH {references.map((r) => r.value).join("–")} yang dipakai aplikasi untuk klasifikasi
          (tidak tampil bila di luar skala). Bukan jaminan air aman diminum.
        </p>
      )}
    </Panel>
  )
}

// RAW vs KALMAN FILTERED charts for pH / TDS / Turbidity. Stored readings of
// the selected period come from MySQL (via Node-RED); new readings are added
// from the app's WebSocket without reloading. Pause only freezes this view —
// ESP32, MQTT, Node-RED, the Kalman Filter and MySQL keep running.
export default function RealtimeCharts({ columns = "lg:grid-cols-3" }) {
  const { config } = useMonitoring()
  const [range, setRange] = useState(() => {
    const saved = readPrefs().chartPeriod
    return CHART_PERIODS.some((p) => p.id === saved && p.id !== "custom") ? saved : DEFAULT_PERIOD
  })
  const [dates, setDates] = useState(() => ({ from: todayKey(), to: todayKey() }))
  const series = useSeries({ range, from: dates.from, to: dates.to })
  const [frozen, setFrozen] = useState(null) // rows shown while paused

  const paused = frozen !== null
  const rows = paused ? frozen : series.rows
  const newest = rows[0]?.timestamp ?? null

  const phRule = config?.thresholds?.rules?.find((r) => r.parameter === "ph")
  const phRefs = [phRule?.goodMin ?? 6.5, phRule?.goodMax ?? 8.5].map((v) => ({ value: v, label: String(v) }))

  const selectRange = (id) => {
    setFrozen(null)
    setRange(id)
  }
  const today = todayKey()
  const stride = series.meta?.stride ?? 1

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Periode grafik">
          {CHART_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={range === p.id}
              onClick={() => selectRange(p.id)}
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
                range === p.id ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-ink-soft hover:border-accent hover:text-accent"
              }`}
            >
              {p.label}
            </button>
          ))}
          <Button
            size="sm"
            variant={paused ? "primary" : "secondary"}
            icon={paused ? Play : Pause}
            onClick={() => setFrozen(paused ? null : series.rows)}
            disabled={!series.live && !paused}
            title="Hanya menghentikan pembaruan tampilan grafik; pembacaan sensor dan penyimpanan tetap berjalan"
          >
            {paused ? "Resume" : "Pause"}
          </Button>
        </div>
        <SeriesLegend />
      </div>

      {range === "custom" && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:max-w-sm">
          <label className="text-xs text-ink-soft">
            From
            <input type="date" className={`${fieldClass} mt-1`} value={dates.from} max={dates.to || today} onChange={(e) => setDates({ ...dates, from: e.target.value })} />
          </label>
          <label className="text-xs text-ink-soft">
            To
            <input type="date" className={`${fieldClass} mt-1`} value={dates.to} min={dates.from || undefined} max={today} onChange={(e) => setDates({ ...dates, to: e.target.value })} />
          </label>
        </div>
      )}

      <p className="mb-3 text-xs text-ink-faint" aria-live="polite">
        <span className="font-semibold text-ink-soft">Live Monitoring</span> · data sensor aktual ·{" "}
        {paused ? "⏸ Tampilan dijeda — data tetap dicatat. " : ""}
        {newest ? `Data terakhir pada grafik: ${formatDateTime(newest)} WITA` : "Belum ada data pada periode ini"}
        {series.meta && ` · ${formatCount(series.meta.total)} data tersimpan pada periode`}
        {stride > 1 && ` · ditampilkan setiap ${stride} data (${formatCount(series.meta.returned)} titik asli) agar grafik ringan; metrik evaluasi tetap memakai semua data`}
      </p>

      {series.status === "fallback" && (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-warning">
          <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Endpoint riwayat grafik belum aktif di Node-RED — menampilkan maks. 500 pembacaan terakhir yang ada di memori.
        </p>
      )}

      {series.status === "error" && !rows.length ? (
        <EmptyState icon={TriangleAlert} tone="error" title="Data grafik tidak dapat dimuat" description={series.error} />
      ) : (
        <div className={`grid grid-cols-1 gap-4 ${columns}`}>
          {PARAMETERS.map((p) => (
            <ChartCard key={p.key} parameter={p} readings={rows} status={series.status} references={p.key === "ph" ? phRefs : []} />
          ))}
        </div>
      )}
    </div>
  )
}
