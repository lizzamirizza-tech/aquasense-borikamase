// notification_log rows sent from stored readings carry the internal marker
// HISTORICAL_REPLAY in event_type (used by Node-RED for de-duplication). It is
// never shown; for those rows the displayed time is the original measurement
// time (reading_timestamp). created_at — the real send time — stays in the
// database and is what the delivery statistics use.
const REPLAY = "HISTORICAL_REPLAY"

export function isReplay(row) {
  return String(row.event_type || "").split(",").includes(REPLAY)
}

export function eventLabel(row) {
  return String(row.event_type || "")
    .split(",")
    .filter((e) => e && e !== REPLAY)
    .join(", ")
    .replace(/_/g, " ")
    .toLowerCase()
}

export function displayTime(row) {
  return new Date(isReplay(row) && row.reading_timestamp ? row.reading_timestamp : row.created_at)
}
