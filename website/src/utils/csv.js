import { formatSortableDateTime } from "./format.js"

// Export columns. Timestamps are exported in WITA (UTC+8), as displayed on the website.
export const EXPORT_COLUMNS = [
  { header: "timestamp_wita", get: (r) => formatSortableDateTime(r.timestamp) },
  { header: "session", get: (r) => r.session ?? "" },
  { header: "device_id", get: (r) => r.device_id ?? "" },
  { header: "ph_raw", get: (r) => r.ph_raw, numeric: true },
  { header: "ph_filtered", get: (r) => r.ph_filtered, numeric: true },
  { header: "tds_raw_ppm", get: (r) => r.tds_raw, numeric: true },
  { header: "tds_filtered_ppm", get: (r) => r.tds_filtered, numeric: true },
  { header: "turbidity_raw_ntu", get: (r) => r.turbidity_raw, numeric: true },
  { header: "turbidity_filtered_ntu", get: (r) => r.turbidity_filtered, numeric: true },
  { header: "sensor_status", get: (r) => r.sensor_status ?? "" },
  { header: "water_quality", get: (r) => r.water_quality ?? "" },
]

function escapeCell(value) {
  const str = value === null || value === undefined ? "" : String(value)
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function readingsToCsv(rows) {
  const header = EXPORT_COLUMNS.map((c) => escapeCell(c.header)).join(",")
  const lines = rows.map((row) => EXPORT_COLUMNS.map((c) => escapeCell(c.get(row))).join(","))
  return [header, ...lines].join("\r\n")
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(filename, csvString) {
  // BOM so spreadsheet apps detect UTF-8
  downloadBlob(filename, new Blob(["﻿", csvString], { type: "text/csv;charset=utf-8;" }))
}

// AquaSense_History_2026-09-24_Pagi.csv
// AquaSense_History_2026-09-01_to_2026-09-24_AllSessions_DANGER.csv
export function exportFilename({ from, to, session, quality }, ext) {
  const range = !from && !to ? "AllDates" : from === to ? from : `${from || "start"}_to_${to || "now"}`
  const parts = ["AquaSense_History", range]
  parts.push(session && session !== "all" ? session.replace(/\s+/g, "") : "AllSessions")
  if (quality && quality !== "all") parts.push(quality)
  return `${parts.join("_")}.${ext}`
}
