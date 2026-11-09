import { useEffect, useMemo, useState } from "react"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { fetchReadings } from "../services/api.js"
import { mergeReadings } from "../utils/reading.js"
import { witaDateKey } from "../utils/format.js"

const PAGE_SIZE = 200 // history.maxPageSize of /api/water/readings

// Every stored reading of the WITA date range [from, to] (inclusive) in the
// given observation sessions, oldest → newest, read page by page from
// /api/water/readings (newest first per session). Readings that arrive later
// over the app's WebSocket and match the filters are appended, so whatever is
// computed from the rows stays current.
export function useKalmanDataset({ from, to, sessions }) {
  const { readings } = useMonitoring()
  const sessionKey = sessions.join(",")
  const key = `${from}|${to}|${sessionKey}`
  const [state, setState] = useState({ key: null })

  useEffect(() => {
    if (!from || !to || from > to || !sessionKey) return undefined
    const controller = new AbortController()
    const options = { signal: controller.signal }
    async function loadSession(session) {
      const first = await fetchReadings({ from, to, session, page: 1, pageSize: PAGE_SIZE }, options)
      const rest = Array.from({ length: Math.max(0, (first.total_pages ?? 1) - 1) }, (_, i) =>
        fetchReadings({ from, to, session, page: i + 2, pageSize: PAGE_SIZE }, options),
      )
      return [first, ...(await Promise.all(rest))].flatMap((d) => d.rows)
    }
    Promise.all(sessionKey.split(",").map(loadSession))
      .then((lists) => setState({ key, status: "ok", rows: mergeReadings(lists.flat(), []), loadedAt: Date.now() }))
      .catch((err) => !controller.signal.aborted && setState({ key, status: "error", error: err.message }))
    return () => controller.abort()
  }, [key, from, to, sessionKey])

  return useMemo(() => {
    if (state.key !== key) return { status: "loading", rows: [] }
    if (state.status === "error") return { status: "error", rows: [], error: state.error }
    const newest = state.rows[0]?.timestamp ?? 0
    const fresh = readings.filter((r) => {
      if (r.timestamp <= newest || !sessions.includes(r.session)) return false
      const day = witaDateKey(r.timestamp)
      return day >= from && day <= to
    })
    const newestFirst = fresh.length ? mergeReadings(fresh, state.rows) : state.rows
    return { status: "ok", rows: [...newestFirst].reverse(), loadedAt: state.loadedAt }
  }, [state, key, readings, sessions, from, to])
}
