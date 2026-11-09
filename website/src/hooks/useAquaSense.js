import { useCallback, useEffect, useMemo, useState } from "react"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { fetchMetrics, fetchSummary } from "../services/api.js"
import { getLiveState } from "../utils/systemStatus.js"

// Re-renders the caller every `intervalMs` so "x seconds ago" labels and
// freshness checks stay current.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

// LIVE / WAITING / OFFLINE for the caller (see utils/systemStatus.js).
export function useLiveState(intervalMs = 1000) {
  const { health, wsStatus, latest, config } = useMonitoring()
  const now = useNow(intervalMs)
  return { live: getLiveState({ health, wsStatus, latest, now, config }), now }
}

// Server-side statistics for the given filters. Re-fetched when the filters
// change and, if `followLive` is set, when a new reading arrives (throttled).
//
// Statistics of a previous filter set are never shown: while a new filter
// set loads, status is "loading" and data is null. A live/retry refresh of
// the same filters keeps the current numbers visible ("refreshing").
export function useSummary(filters, options) {
  return useFilteredRequest(fetchSummary, filters, options)
}

// Kalman Filter evaluation metrics (every stored row of the period, computed
// by MySQL through Node-RED) — same loading/refresh behaviour as useSummary.
export function useMetrics(filters, options) {
  return useFilteredRequest(fetchMetrics, filters, options)
}

function useFilteredRequest(fetcher, filters, { followLive = false } = {}) {
  const { latest } = useMonitoring()
  const filterKey = JSON.stringify(filters)
  const liveKey = followLive && latest ? Math.floor(latest.timestamp.getTime() / 30_000) : 0
  const [reload, setReload] = useState(0)
  const requestKey = JSON.stringify([filterKey, liveKey, reload])
  const [result, setResult] = useState({ requestKey: null, filterKey: null, status: "loading", data: null, error: null })

  useEffect(() => {
    const controller = new AbortController()
    const [fk] = JSON.parse(requestKey)
    fetcher(JSON.parse(fk), { signal: controller.signal })
      .then((data) => setResult({ requestKey, filterKey: fk, status: "ok", data, error: null }))
      .catch((err) => {
        if (controller.signal.aborted) return
        setResult((prev) => ({ requestKey, filterKey: fk, status: "error", data: prev.filterKey === fk ? prev.data : null, error: err.message }))
      })
    return () => controller.abort()
  }, [requestKey, fetcher])

  const retry = useCallback(() => setReload((n) => n + 1), [setReload])
  return useMemo(() => {
    if (result.filterKey !== filterKey) return { status: "loading", data: null, error: null, retry }
    if (result.requestKey !== requestKey) return { ...result, status: result.status === "error" ? "error" : "refreshing", retry }
    return { ...result, retry }
  }, [result, filterKey, requestKey, retry])
}
