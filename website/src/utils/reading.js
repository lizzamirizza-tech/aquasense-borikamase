// Validation / normalization of readings coming from Node-RED (REST or
// WebSocket). Anything malformed is dropped instead of crashing the UI, and
// missing numbers stay null — they are never replaced with 0.
// Values are displayed exactly as the backend produced them: nothing here
// filters, classifies or recalculates a reading.

export const NUMERIC_FIELDS = [
  "ph_raw",
  "ph_filtered",
  "tds_raw",
  "tds_filtered",
  "turbidity_raw",
  "turbidity_filtered",
]

export const QUALITY_VALUES = ["GOOD", "WARNING", "DANGER"]

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toLabel(value) {
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : null
}

// The API returns ISO strings with an explicit offset ("…+08:00" or "…Z").
// A bare "YYYY-MM-DD HH:mm:ss" (no zone) is treated as UTC.
export function parseTimestamp(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "number") return parseTimestamp(new Date(value))
  if (typeof value !== "string" || !value.trim()) return null
  let s = value.trim()
  if (!s.includes("T")) s = s.replace(" ", "T")
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += "Z"
  return parseTimestamp(new Date(s))
}

export function normalizeReading(input) {
  if (!input || typeof input !== "object") return null

  const timestamp = parseTimestamp(input.timestamp)
  if (!timestamp) return null

  const quality = toLabel(input.water_quality)
  const reading = {
    id: input.id ?? null,
    device_id: typeof input.device_id === "string" ? input.device_id : null,
    timestamp,
    sensor_status: toLabel(input.sensor_status),
    water_quality: QUALITY_VALUES.includes(quality) ? quality : null,
    session: typeof input.session === "string" && input.session ? input.session : null,
  }
  for (const field of NUMERIC_FIELDS) reading[field] = toNumber(input[field])

  if (NUMERIC_FIELDS.every((field) => reading[field] === null)) return null
  return reading
}

// The WebSocket timestamp has milliseconds, the stored one is truncated to
// seconds — key on whole seconds so the same reading is not shown twice.
export function readingKey(reading) {
  return `${reading.device_id ?? ""}|${Math.floor(reading.timestamp.getTime() / 1000)}`
}

// The WebSocket copy is stamped by Node-RED, the stored copy by MySQL NOW()
// a few milliseconds later — which can fall in the next second. A pushed
// reading (no id) within this tolerance of a stored one with identical raw
// values is the same measurement.
const SAME_READING_MS = 2000

function sameMeasurement(a, b) {
  return (
    a.device_id === b.device_id &&
    Math.abs(a.timestamp - b.timestamp) <= SAME_READING_MS &&
    a.ph_raw === b.ph_raw &&
    a.tds_raw === b.tds_raw &&
    a.turbidity_raw === b.turbidity_raw
  )
}

// Merge two reading lists: newest first, de-duplicated, preferring the entry
// that already has a database id.
export function mergeReadings(incoming, existing, limit) {
  const byKey = new Map()
  for (const r of [...existing, ...incoming]) {
    const key = readingKey(r)
    const current = byKey.get(key)
    if (!current || (current.id === null && r.id !== null)) byKey.set(key, r)
  }
  const sorted = [...byKey.values()].sort((a, b) => b.timestamp - a.timestamp)
  const merged = sorted.filter((r, i) => {
    if (r.id !== null) return true
    const near = [sorted[i - 1], sorted[i + 1]]
    return !near.some((o) => o && o.id !== null && sameMeasurement(r, o))
  })
  return limit ? merged.slice(0, limit) : merged
}

export function newestOf(a, b) {
  if (!a) return b ?? null
  if (!b) return a
  return b.timestamp > a.timestamp ? b : a
}
