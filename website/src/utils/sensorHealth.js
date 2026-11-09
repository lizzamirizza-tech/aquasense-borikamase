// Health of one sensor, from the actual latest reading only:
//
//   error   – the device reported an error status (sensor_status contains ERR/FAIL)
//   nodata  – there is no reading, or this parameter's value is missing
//   warning – a value exists but it is not fresh (no recent reading)
//   normal  – a fresh, valid value (it passed Node-RED validation)
//
// sensor_status is reported per device, not per sensor. When the firmware
// does not report a status (Node-RED stores "UNKNOWN"), health is based on
// data validity and freshness and the note says so.
export const HEALTH_META = {
  normal: { label: "Normal", icon: "✓", tone: "good" },
  warning: { label: "Warning", icon: "⚠", tone: "warning" },
  danger: { label: "Danger", icon: "🚨", tone: "danger" },
  error: { label: "Error", icon: "✕", tone: "danger" },
  nodata: { label: "No Data", icon: "○", tone: "neutral" },
}

export function isErrorStatus(status) {
  return /ERR|FAIL/.test(String(status || "").toUpperCase())
}

export function isOkStatus(status) {
  return ["SUCCESS", "OK", "NORMAL"].includes(String(status || "").toUpperCase())
}

// "normal" | "warning" | "danger" for one value against a threshold rule.
// pH has no warning band: outside goodMin–goodMax is danger.
function rateValue(value, rule) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  if (rule.goodMin !== undefined) return value >= rule.goodMin && value <= rule.goodMax ? "normal" : "danger"
  if (value < rule.goodBelow) return "normal"
  return value < rule.warningBelow ? "warning" : "danger"
}

export function getSensorHealth(reading, parameter, fresh, rule) {
  if (!reading) return { state: "nodata", note: "No recent reading · sensor unavailable" }
  if (isErrorStatus(reading.sensor_status)) return { state: "error", note: `Device reported ${reading.sensor_status}` }
  const value = reading[parameter.rawKey] ?? reading[parameter.filteredKey]
  if (value === null || value === undefined) return { state: "nodata", note: "No valid value in the latest reading" }
  // Category of this parameter's value, with the thresholds from /api/config
  // (the rules of the Node-RED "Quality Check" node, on filtered values).
  const rated = rule ? rateValue(reading[parameter.filteredKey] ?? value, rule) : null
  if (rated === "warning" || rated === "danger") return { state: rated, note: `${HEALTH_META[rated].label}: ${rule[rated]}${rule.unit ? ` ${rule.unit}` : ""}` }
  if (!fresh) return { state: "normal", note: "No recent reading · showing last known value" }
  return {
    state: "normal",
    note: isOkStatus(reading.sensor_status)
      ? `Valid reading · device status ${reading.sensor_status}`
      : "Valid, fresh reading (device does not report a sensor status)",
  }
}
