import { TIMEZONE, TIMEZONE_LABEL } from "../config.js"

// All monitoring timestamps are displayed in WITA (Asia/Makassar) regardless
// of the browser's own timezone. The underlying Date values are untouched.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

const toDate = (date) => (date instanceof Date ? date : new Date(date))

// { year, month, day, hour, minute, second } in WITA (numbers)
export function witaParts(date) {
  const out = {}
  for (const p of partsFormatter.formatToParts(toDate(date))) {
    if (p.type !== "literal") out[p.type] = Number(p.value)
  }
  return out
}

const pad = (n) => String(n).padStart(2, "0")

export function formatTime(date) {
  const p = witaParts(date)
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

export function formatDate(date) {
  const p = witaParts(date)
  return `${pad(p.day)} ${MONTHS[p.month - 1]} ${p.year}`
}

// "24 Sep 2026 • 22:45:03"
export function formatDateTime(date) {
  return `${formatDate(date)} • ${formatTime(date)}`
}

// "2026-09-24 22:45:03" (WITA) — CSV export and search.
export function formatSortableDateTime(date) {
  const p = witaParts(date)
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

// "2026-09-24" — the WITA calendar date of an instant.
export function witaDateKey(date) {
  const p = witaParts(date)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function formatRelative(date, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - toDate(date).getTime()) / 1000))
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"} ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`
  return `${Math.floor(hours / 24)} days ago`
}

// Compact form for small screens: "8s", "3m", "2h", "4d".
export function formatRelativeShort(date, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - toDate(date).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

// Numbers are shown only when they exist — missing values render as "—".
export function formatValue(value, decimals) {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(decimals)
}

export function formatCount(value) {
  return value === null || value === undefined ? "—" : value.toLocaleString("en-US")
}

export function formatPercent(part, total) {
  if (!total) return "—"
  return `${((part / total) * 100).toFixed(1)}%`
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "—"
  if (seconds < 60) return `${seconds} s`
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  return `${(seconds / 3600).toFixed(seconds % 3600 === 0 ? 0 : 1)} h`
}

export const ZONE_LABEL = TIMEZONE_LABEL
