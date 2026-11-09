import { useEffect, useMemo, useState } from "react"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { fetchSeries } from "../services/api.js"
import { mergeReadings } from "../utils/reading.js"
import { witaDateKey } from "../utils/format.js"
import { useNow } from "./useAquaSense.js"

// Chart periods. Relative periods slide with time and receive live readings;
// "all" receives live readings; a custom date range is fixed.
export const CHART_PERIODS = [
  { id: "15m", label: "15 min", ms: 15 * 60_000 },
  { id: "1h", label: "1 jam", ms: 60 * 60_000 },
  { id: "24h", label: "24 jam", ms: 24 * 60 * 60_000 },
  { id: "all", label: "Semua" },
  { id: "custom", label: "Tanggal" },
]
export const DEFAULT_PERIOD = "1h"
const periodById = Object.fromEntries(CHART_PERIODS.map((p) => [p.id, p]))

// Readings for the live charts (newest first):
//   stored rows of the period from /api/water/series, plus the readings that
//   arrived afterwards through the app's single WebSocket (MonitoringContext).
// No extra socket or polling is opened here. If the series endpoint is not
// deployed yet (404), the readings already held in memory (latest 500) are
// used instead and `fallback` is set.
export function useSeries({ range, from, to }) {
  const { readings, health } = useMonitoring()
  const period = periodById[range] ?? periodById[DEFAULT_PERIOD]
  const live = range !== "custom"
  const key = JSON.stringify({ range, from: range === "custom" ? from : "", to: range === "custom" ? to : "" })
  const [result, setResult] = useState({ key: null, status: "loading", rows: [], meta: null, error: null })
  const now = useNow(15_000) + (health.clockSkewMs || 0)

  useEffect(() => {
    const controller = new AbortController()
    const params = JSON.parse(key)
    if (params.range === "custom" && (!params.from || !params.to)) return () => controller.abort()
    fetchSeries(params, { signal: controller.signal })
      .then((data) => setResult({ key, status: "ok", rows: [...data.rows].reverse(), meta: data, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return
        setResult({ key, status: err.status === 404 ? "fallback" : "error", rows: [], meta: null, error: err.message })
      })
    return () => controller.abort()
  }, [key])

  const current = result.key === key ? result : { status: "loading", rows: [], meta: null, error: null }

  const rows = useMemo(() => {
    if (current.status === "loading" || current.status === "error") return current.rows
    let out = current.rows
    if (current.status === "fallback") {
      out = range === "custom" ? readings.filter((r) => witaDateKey(r.timestamp) >= from && witaDateKey(r.timestamp) <= to) : readings
    } else if (live) {
      const newest = out[0]?.timestamp ?? 0
      const fresh = readings.filter((r) => r.timestamp > newest)
      if (fresh.length) out = mergeReadings(fresh, out)
    }
    if (period.ms) out = out.filter((r) => now - r.timestamp.getTime() <= period.ms)
    return out
  }, [current.status, current.rows, readings, live, period.ms, now, range, from, to])

  return { status: current.status, rows, meta: current.meta, error: current.error, live }
}
