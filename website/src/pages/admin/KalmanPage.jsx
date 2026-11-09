import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "../../components/Section.jsx"
import { FilterPerformanceEvaluation, SensorAccuracyEvaluation } from "../../components/KalmanEvaluation.jsx"
import KalmanVisualization from "../../components/KalmanVisualization.jsx"
import { useMonitoring } from "../../context/MonitoringContext.jsx"
import { useKalmanDataset } from "../../hooks/useKalmanDataset.js"
import { fetchSummary } from "../../services/api.js"
import { todayKey } from "../../utils/dateRange.js"
import { witaDateKey } from "../../utils/format.js"

// Used until GET /api/config has answered; the backend list wins.
const FALLBACK_SESSIONS = [
  { name: "Pagi", startHour: 8, endHour: 11 },
  { name: "Siang", startHour: 13, endHour: 16 },
  { name: "Sore", startHour: 16, endHour: 19 },
]

// Kalman Analysis: sensor accuracy (test results), filter performance
// (computed from the stored readings of the selected dates and sessions) and
// the RAW vs FILTERED visualization. The date / session filters apply to both
// the evaluation and the chart.
export default function KalmanPage() {
  const { config } = useMonitoring()
  const sessions = config?.sessions?.length ? config.sessions : FALLBACK_SESSIONS
  const [filters, setFilters] = useState({ from: "", to: todayKey(), session: "all" })

  // Start Date defaults to the day of the first stored reading.
  useEffect(() => {
    if (filters.from) return undefined
    const controller = new AbortController()
    fetchSummary({}, { signal: controller.signal })
      .then((s) => setFilters((f) => (f.from ? f : { ...f, from: s.first_at ? witaDateKey(new Date(s.first_at)) : f.to })))
      .catch(() => !controller.signal.aborted && setFilters((f) => (f.from ? f : { ...f, from: f.to })))
    return () => controller.abort()
  }, [filters.from])

  const sessionNames = useMemo(
    () => (filters.session === "all" ? sessions.map((s) => s.name) : [filters.session]),
    [filters.session, sessions],
  )
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to)
  const dataset = useKalmanDataset({ from: filters.from, to: filters.to, sessions: sessionNames })

  return (
    <div className="space-y-10">
      <PageHeader title="Kalman Analysis" description="Sensor accuracy, filtering performance, and measurement stability." />
      <SensorAccuracyEvaluation />
      <FilterPerformanceEvaluation dataset={dataset} invalidRange={invalidRange} />
      <KalmanVisualization
        dataset={dataset}
        filters={filters}
        onFiltersChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        sessions={sessions}
        invalidRange={invalidRange}
      />
    </div>
  )
}
