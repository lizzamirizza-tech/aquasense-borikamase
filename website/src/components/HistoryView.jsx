import { useEffect, useMemo, useState } from "react"
import { BarChart3, ChevronLeft, ChevronRight, Download, FileSpreadsheet, RefreshCw, Search, TriangleAlert } from "lucide-react"
import { Alert, Button, Panel } from "./Section.jsx"
import EmptyState, { Skeleton } from "./EmptyState.jsx"
import StatCard from "./StatCard.jsx"
import HistoricalPlayback from "./HistoricalPlayback.jsx"
import { DateFilter, SelectField, SessionFilter, fieldClass } from "./Filters.jsx"
import { QualityBadge, SensorStatusBadge, SessionBadge } from "./StatusBadge.jsx"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { useSummary } from "../hooks/useAquaSense.js"
import { fetchExport, fetchReadings } from "../services/api.js"
import { PARAMETERS } from "../constants/parameters.js"
import { describeRange, rangeFor } from "../utils/dateRange.js"
import { formatCount, formatDate, formatPercent, formatTime, formatValue } from "../utils/format.js"
import { readingKey } from "../utils/reading.js"
import { downloadBlob, downloadCsv, exportFilename, readingsToCsv } from "../utils/csv.js"
import { readingsToXlsx } from "../utils/xlsx.js"

const PAGE_SIZES = [10, 25, 50, 100]

// Date → Session → Monitoring data. Filtering, pagination and statistics are
// done by the backend on exactly the same filter set, so every number on this
// page describes the selected period only.
export default function HistoryView({ allowExport = false }) {
  const { config } = useMonitoring()
  const [date, setDate] = useState(() => ({ rangeId: "7d", ...rangeFor("7d") }))
  const [session, setSession] = useState("all")
  const [quality, setQuality] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [pageSize, setPageSize] = useState(25)
  const [pageState, setPageState] = useState({ key: null, page: 1 })
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState({ key: null, status: "loading", data: null, error: null })
  const [exporting, setExporting] = useState(null)
  const [exportError, setExportError] = useState(null)

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(id)
  }, [searchInput])

  const invalidRange = date.from && date.to && date.from > date.to
  const filters = useMemo(
    () => ({ from: date.from, to: date.to, session, quality, search }),
    [date.from, date.to, session, quality, search],
  )
  const filterKey = JSON.stringify(filters)

  // any filter / page-size change → back to page 1
  const pageScope = JSON.stringify([filterKey, pageSize])
  const page = pageState.key === pageScope ? pageState.page : 1
  const setPage = (p) => setPageState({ key: pageScope, page: p })
  const dataKey = JSON.stringify([filterKey, pageSize, page])

  const summary = useSummary(invalidRange ? { ...filters, from: "", to: "" } : filters)

  useEffect(() => {
    if (invalidRange) return
    const controller = new AbortController()
    const [fk, size, p] = JSON.parse(dataKey)
    fetchReadings({ ...JSON.parse(fk), page: Number(p), pageSize: Number(size) }, { signal: controller.signal })
      .then((data) => setResult({ key: dataKey, status: "ok", data, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return
        setResult((prev) => ({ key: dataKey, status: "error", data: prev.key === dataKey ? prev.data : null, error: err.message }))
      })
    return () => controller.abort()
  }, [dataKey, reload, invalidRange])

  // rows of another filter/page are never shown while the new ones load
  const table = result.key === dataKey ? result : { status: "loading", data: null, error: null }

  async function handleExport(kind) {
    setExporting(kind)
    setExportError(null)
    try {
      const data = await fetchExport(filters)
      const name = exportFilename(filters, kind === "xlsx" ? "xlsx" : "csv")
      if (kind === "xlsx") downloadBlob(name, readingsToXlsx(data.rows))
      else downloadCsv(name, readingsToCsv(data.rows))
      if (data.truncated) setExportError(`Export limited to the first ${formatCount(data.max_rows)} rows. Narrow the date range to export the rest.`)
    } catch (err) {
      setExportError(`Export failed. ${err.message}`)
    } finally {
      setExporting(null)
    }
  }

  const rows = table.data?.rows ?? []
  const total = table.data?.total ?? 0
  const totalPages = table.data?.total_pages ?? 1
  const s = summary.data
  const sumLoading = summary.status === "loading"
  const scope = `${describeRange(date.from, date.to)} · ${session === "all" ? "All sessions" : session}${quality !== "all" ? ` · ${quality}` : ""}`
  const avg = (key) => s?.stats?.[key]?.filtered?.avg

  return (
    <div className="space-y-5">
      {/* 1 · Date → 2 · Session → filters */}
      <Panel className="space-y-4 p-4 sm:p-5">
        <DateFilter value={date} onChange={setDate} />
        <SessionFilter value={session} onChange={setSession} sessions={config?.sessions} outsideLabel={config?.outside_session_label} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
          <label className="block text-xs font-semibold text-ink-soft">
            Search
            <span className="relative mt-1.5 block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari tanggal, status, sesi"
                className={`${fieldClass} pl-9`}
                maxLength={50}
              />
            </span>
          </label>
          <SelectField
            label="Water quality"
            value={quality}
            onChange={setQuality}
            options={[
              { value: "all", label: "All categories" },
              { value: "GOOD", label: "✓ GOOD" },
              { value: "WARNING", label: "⚠ WARNING" },
              { value: "DANGER", label: "🚨 DANGER" },
            ]}
          />
        </div>
        {invalidRange && <Alert tone="warning" icon={TriangleAlert}>“From” date must not be after “To” date.</Alert>}
      </Panel>

      {/* Summary for the selected filters only */}
      <section aria-label="Summary for selected filters">
        <p className="mb-2 text-xs text-ink-faint">{scope}</p>
        {summary.status === "error" && (
          <Alert tone="danger" icon={TriangleAlert} className="mb-3" action={<Button size="sm" icon={RefreshCw} onClick={summary.retry}>Retry</Button>}>
            Unable to load statistics. {summary.error}
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Total" value={formatCount(s?.total)} loading={sumLoading} />
          <StatCard label="Good" icon="✓" tone="good" value={formatCount(s?.good)} sub={s ? formatPercent(s.good, s.total) : null} loading={sumLoading} />
          <StatCard label="Warning" icon="⚠" tone="warning" value={formatCount(s?.warning)} sub={s ? formatPercent(s.warning, s.total) : null} loading={sumLoading} />
          <StatCard label="Danger" icon="🚨" tone="danger" value={formatCount(s?.danger)} sub={s ? formatPercent(s.danger, s.total) : null} loading={sumLoading} />
          <StatCard label="Avg pH" value={formatValue(avg("ph"), 2)} sub="filtered" loading={sumLoading} />
          <StatCard label="Avg TDS" value={formatValue(avg("tds"), 1)} sub="ppm · filtered" loading={sumLoading} />
          <StatCard label="Avg Turbidity" value={formatValue(avg("turbidity"), 2)} sub="NTU · filtered" loading={sumLoading} />
        </div>
      </section>

      {/* Historical Playback — charts only, same filters; remounted on filter change */}
      {!invalidRange && <HistoricalPlayback key={filterKey} filters={filters} />}

      {/* Table */}
      <Panel className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-ink">
            Monitoring data{" "}
            <span className="font-normal text-ink-faint">
              {table.data ? `· ${formatCount(total)} record${total === 1 ? "" : "s"}` : ""}
              {table.status === "refreshing" ? " · updating…" : ""}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={RefreshCw} onClick={() => { setReload((n) => n + 1); summary.retry() }}>
              Refresh
            </Button>
            {allowExport && (
              <>
                <Button size="sm" icon={Download} variant="primary" disabled={!total || !!exporting} onClick={() => handleExport("csv")}>
                  {exporting === "csv" ? "Exporting…" : "Export CSV"}
                </Button>
                <Button size="sm" icon={FileSpreadsheet} disabled={!total || !!exporting} onClick={() => handleExport("xlsx")}>
                  {exporting === "xlsx" ? "Exporting…" : "Export Excel"}
                </Button>
              </>
            )}
          </div>
        </div>
        {exportError && (
          <Alert tone="warning" icon={TriangleAlert} className="m-4">
            {exportError}
          </Alert>
        )}

        {table.status === "error" && !table.data ? (
          <EmptyState
            icon={TriangleAlert}
            tone="error"
            className="m-4"
            title="Unable to load monitoring history. Please try again."
            description={table.error}
            action={<Button icon={RefreshCw} onClick={() => setReload((n) => n + 1)}>Retry</Button>}
          />
        ) : table.status === "loading" ? (
          <div className="space-y-2 p-4" role="status">
            <span className="sr-only">Loading history…</span>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
            <p className="text-xs text-ink-faint">Loading history…</p>
          </div>
        ) : !rows.length ? (
          <EmptyState
            icon={BarChart3}
            className="m-4"
            title="📊 No Monitoring Data"
            description="No readings were recorded for the selected date/session."
            action={
              <>
                <Button size="sm" onClick={() => setDate({ rangeId: "30d", ...rangeFor("30d") })}>Try another date</Button>
                <Button size="sm" onClick={() => setSession("all")} disabled={session === "all"}>Try another session</Button>
              </>
            }
          />
        ) : (
          <>
            {table.status === "error" && (
              <Alert tone="danger" icon={TriangleAlert} className="m-4">
                Showing the previous result. {table.error}
              </Alert>
            )}
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[1080px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-surface-alt">
                  <tr className="text-left text-[11px] tracking-wider text-ink-soft uppercase">
                    <th className="border-b border-line px-4 py-2.5 font-semibold">DateTime (WITA)</th>
                    <th className="border-b border-line px-3 py-2.5 font-semibold">Session</th>
                    {PARAMETERS.map((p) => (
                      <ParameterHeaders key={p.key} p={p} />
                    ))}
                    <th className="border-b border-line px-3 py-2.5 font-semibold">Sensor status</th>
                    <th className="border-b border-line px-3 py-2.5 font-semibold">Water quality</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={readingKey(r)} className="border-b border-line last:border-0 hover:bg-surface-alt">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-ink">{formatDate(r.timestamp)}</span>
                        <span className="ml-2 font-mono text-xs font-semibold text-ink">{formatTime(r.timestamp)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <SessionBadge session={r.session} />
                      </td>
                      {PARAMETERS.map((p) => (
                        <ValuePair key={p.key} raw={r[p.rawKey]} filtered={r[p.filteredKey]} decimals={p.decimals} />
                      ))}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <SensorStatusBadge status={r.sensor_status} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <QualityBadge quality={r.water_quality} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <p>
                  {formatCount((page - 1) * pageSize + 1)}–{formatCount((page - 1) * pageSize + rows.length)} of {formatCount(total)}
                </p>
                <label className="flex items-center gap-2 text-xs">
                  Rows
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="min-h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm text-ink">
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <PageButton label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </PageButton>
                <span className="min-w-20 text-center font-mono text-xs text-ink">
                  {page} / {totalPages}
                </span>
                <PageButton label="Next page" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </PageButton>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

function ParameterHeaders({ p }) {
  const unit = p.unit ? ` (${p.unit})` : ""
  return (
    <>
      <th className="border-b border-l border-line px-3 py-2.5 text-right font-semibold whitespace-nowrap">{p.label} Raw{unit}</th>
      <th className="border-b border-line px-3 py-2.5 text-right font-semibold whitespace-nowrap">{p.label} Filtered{unit}</th>
    </>
  )
}

function ValuePair({ raw, filtered, decimals }) {
  return (
    <>
      <td className="border-l border-line px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap text-ink-soft font-tabular">
        {formatValue(raw, decimals)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold whitespace-nowrap text-ink font-tabular">
        {formatValue(filtered, decimals)}
      </td>
    </>
  )
}

function PageButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong bg-surface hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  )
}
