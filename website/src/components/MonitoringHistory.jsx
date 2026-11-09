import { useMemo, useState } from "react"
import { Search, Download, ChevronLeft, ChevronRight, RefreshCw, Database, Unplug } from "lucide-react"
import Section, { Panel, Button } from "./Section.jsx"
import EmptyState from "./EmptyState.jsx"
import { QualityBadge, SensorStatusBadge } from "./StatusBadge.jsx"
import { PARAMETERS } from "../constants/parameters.js"
import { QUALITY } from "../utils/waterQuality.js"
import { formatDate, formatTime, formatSortableDateTime, formatValue, localZoneLabel } from "../utils/format.js"
import { readingKey } from "../utils/reading.js"
import { readingsToCsv, downloadCsv } from "../utils/csv.js"

const PAGE_SIZE = 10
const CSV_FILENAME = "aquasense-borikamase-monitoring.csv"

const selectClass =
  "rounded-lg border border-line bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-accent-line focus:bg-surface"

export default function MonitoringHistory({ readings, historyState, onRefresh }) {
  const [search, setSearch] = useState("")
  const [sensorFilter, setSensorFilter] = useState("all")
  const [qualityFilter, setQualityFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [refreshing, setRefreshing] = useState(false)

  const sensorOptions = useMemo(
    () => [...new Set(readings.map((r) => r.sensor_status).filter(Boolean))].sort(),
    [readings],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return readings.filter((r) => {
      if (sensorFilter !== "all" && r.sensor_status !== sensorFilter) return false
      if (qualityFilter !== "all" && r.water_quality !== qualityFilter) return false
      if (query) {
        const haystack = [
          formatSortableDateTime(r.timestamp),
          formatDate(r.timestamp),
          r.device_id,
          r.sensor_status,
          r.water_quality,
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [readings, search, sensorFilter, qualityFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)

  const withReset = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const hasFilters = search || sensorFilter !== "all" || qualityFilter !== "all"

  return (
    <Section
      id="history"
      number="05"
      eyebrow="MONITORING HISTORY"
      title="History"
      actions={
        <>
          <Button icon={RefreshCw} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            icon={Download}
            variant="primary"
            disabled={!filtered.length}
            onClick={() => downloadCsv(CSV_FILENAME, readingsToCsv(filtered))}
          >
            Export CSV
          </Button>
        </>
      }
    >
      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              type="search"
              value={search}
              onChange={withReset(setSearch)}
              placeholder="search timestamp, status…"
              aria-label="Search history"
              className={`${selectClass} w-full pl-9`}
            />
          </div>
          <select value={sensorFilter} onChange={withReset(setSensorFilter)} className={selectClass} aria-label="Sensor status">
            <option value="all">All sensor status</option>
            {sensorOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={qualityFilter} onChange={withReset(setQualityFilter)} className={selectClass} aria-label="Water quality">
            <option value="all">All water quality</option>
            {Object.values(QUALITY).map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        {historyState.status === "error" && !readings.length ? (
          <EmptyState
            icon={Unplug}
            tone="error"
            className="m-4"
            title="Riwayat tidak dapat dimuat"
            description={historyState.error}
          />
        ) : historyState.status === "loading" && !readings.length ? (
          <EmptyState icon={Database} className="m-4" title="Loading monitoring history…" />
        ) : !rows.length ? (
          <EmptyState
            icon={hasFilters ? Search : Database}
            className="m-4"
            title={hasFilters ? "Tidak ada data yang cocok dengan filter" : "Waiting for monitoring data..."}
            description={hasFilters ? "Ubah kata kunci atau filter status." : "Belum ada data yang tersimpan di database."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-alt font-mono text-[10px] tracking-wider text-ink-soft">
                  <th rowSpan={2} className="border-b border-line px-5 py-2 text-left align-bottom">
                    TIMESTAMP <span className="font-normal text-ink-faint">({localZoneLabel()})</span>
                  </th>
                  {PARAMETERS.map((p) => (
                    <th key={p.key} colSpan={2} className="border-l border-line px-4 pt-2.5 pb-1 text-center">
                      {p.label.toUpperCase()}
                      {p.unit && <span className="ml-1 font-normal normal-case text-ink-faint">({p.unit})</span>}
                    </th>
                  ))}
                  <th rowSpan={2} className="border-b border-l border-line px-4 py-2 text-left align-bottom">
                    SENSOR
                  </th>
                  <th rowSpan={2} className="border-b border-line px-4 py-2 text-left align-bottom">
                    WATER QUALITY
                  </th>
                </tr>
                <tr className="border-b border-line bg-surface-alt font-mono text-[10px] text-ink-faint">
                  {PARAMETERS.map((p) => (
                    <FragmentHeaders key={p.key} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={readingKey(r)} className="border-b border-line last:border-0 hover:bg-surface-alt">
                    <td className="whitespace-nowrap px-5 py-3">
                      <span className="font-mono text-xs text-ink">{formatTime(r.timestamp)}</span>
                      <span className="ml-2 text-xs text-ink-faint">{formatDate(r.timestamp)}</span>
                    </td>
                    {PARAMETERS.map((p) => (
                      <ValuePair key={p.key} raw={r[p.rawKey]} filtered={r[p.filteredKey]} decimals={p.decimals} />
                    ))}
                    <td className="whitespace-nowrap border-l border-line px-4 py-3">
                      <SensorStatusBadge status={r.sensor_status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <QualityBadge quality={r.water_quality} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-line px-5 py-3 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing <span className="font-medium text-ink">{start + 1}</span>–
              <span className="font-medium text-ink">{start + rows.length}</span> of{" "}
              <span className="font-medium text-ink">{filtered.length}</span> records
            </p>
            <div className="flex items-center gap-2">
              <PageButton label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </PageButton>
              <span className="min-w-20 text-center font-mono text-xs text-ink">
                {currentPage} / {totalPages}
              </span>
              <PageButton
                label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </PageButton>
            </div>
          </div>
        )}
      </Panel>
    </Section>
  )
}

function FragmentHeaders() {
  return (
    <>
      <th className="border-l border-line px-4 pb-2 text-right">Raw</th>
      <th className="px-4 pb-2 text-right text-ink-soft">Filtered</th>
    </>
  )
}

function ValuePair({ raw, filtered, decimals }) {
  return (
    <>
      <td className="whitespace-nowrap border-l border-line px-4 py-3 text-right font-mono text-xs text-ink-soft font-tabular">
        {formatValue(raw, decimals)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-semibold text-ink font-tabular">
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
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface hover:border-accent-line disabled:cursor-not-allowed disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  )
}
