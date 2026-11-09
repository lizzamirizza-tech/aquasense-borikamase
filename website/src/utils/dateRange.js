import { witaDateKey } from "./format.js"

// Quick ranges are computed on WITA calendar days, so "Today" means today in
// Desa Borikamase regardless of the viewer's timezone. Dates are sent to the
// API as "YYYY-MM-DD" and converted to a UTC range by Node-RED.
const DAY = 86_400_000

export const QUICK_RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Custom" },
]

export function todayKey(now = Date.now()) {
  return witaDateKey(new Date(now))
}

export function rangeFor(id, now = Date.now()) {
  const today = todayKey(now)
  const daysAgo = (n) => witaDateKey(new Date(now - n * DAY))
  switch (id) {
    case "today":
      return { from: today, to: today }
    case "yesterday":
      return { from: daysAgo(1), to: daysAgo(1) }
    case "7d":
      return { from: daysAgo(6), to: today }
    case "30d":
      return { from: daysAgo(29), to: today }
    default:
      return { from: "", to: "" }
  }
}

export function describeRange(from, to) {
  if (!from && !to) return "All time"
  if (from && to && from === to) return from
  return `${from || "…"} → ${to || "…"}`
}
