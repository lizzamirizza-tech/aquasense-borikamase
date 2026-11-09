// Descriptive statistics over the raw and Kalman-filtered series received
// from Node-RED. The Kalman Filter itself is NOT recomputed or simulated here —
// these numbers only describe the values the backend produced.

export function mean(values) {
  if (!values.length) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// Sample standard deviation (n − 1).
export function standardDeviation(values) {
  if (values.length < 2) return null
  const m = mean(values)
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

// Fluctuation = mean absolute change between consecutive samples:
//   (1 / (n − 1)) · Σ |xᵢ − xᵢ₋₁|
// It measures short-term noise without being dominated by slow trends. This
// is an additional stability indicator — it is NOT the MAE, RMSE or standard
// deviation reduction used in the thesis evaluation below.
export function meanAbsoluteStep(values) {
  if (values.length < 2) return null
  let total = 0
  for (let i = 1; i < values.length; i++) total += Math.abs(values[i] - values[i - 1])
  return total / (values.length - 1)
}

// Raw-vs-filtered comparison of the in-memory chart window (pairs where both
// values exist, oldest → newest). The thesis evaluation metrics are computed
// by the backend over every stored row instead (GET /api/water/metrics).
//   MAE  = (1/n) · Σ |rawᵢ − filteredᵢ|
//   RMSE = √[(1/n) · Σ (rawᵢ − filteredᵢ)²]
//   SD reduction = (σ_raw − σ_filtered) / σ_raw · 100 %
export function compareRawFiltered(pairs) {
  const raw = pairs.map((p) => p.raw)
  const filtered = pairs.map((p) => p.filtered)
  const n = pairs.length

  const mae = n ? pairs.reduce((s, p) => s + Math.abs(p.raw - p.filtered), 0) / n : null
  const rmse = n ? Math.sqrt(pairs.reduce((s, p) => s + (p.raw - p.filtered) ** 2, 0) / n) : null
  const rawStd = standardDeviation(raw)
  const filteredStd = standardDeviation(filtered)
  const sdReduction = rawStd ? ((rawStd - filteredStd) / rawStd) * 100 : null

  const rawStep = meanAbsoluteStep(raw)
  const filteredStep = meanAbsoluteStep(filtered)
  const fluctuationReduction = rawStep ? ((rawStep - filteredStep) / rawStep) * 100 : null

  return { samples: n, mae, rmse, rawStd, filteredStd, sdReduction, rawStep, filteredStep, fluctuationReduction }
}

// Stability of one sensor over its most recent readings.
//   readings: newest first (as held in memory); only readings within
//   `maxSpanMs` of the newest one are used, so a gap in data is not mistaken
//   for a fluctuation. Uses RAW values (what the sensor actually measured).
//   Bands per parameter come from constants/parameters.js (display only).
export function sensorStability(readings, parameter, { window = 10, maxSpanMs = 30 * 60_000 } = {}) {
  const newest = readings[0]
  if (!newest) return null
  const values = []
  for (const r of readings) {
    if (newest.timestamp - r.timestamp > maxSpanMs) break
    const v = r[parameter.rawKey]
    if (v !== null) values.push(v)
    if (values.length >= window) break
  }
  if (values.length < 3) return { samples: values.length, fluctuation: null, status: null }
  const fluctuation = meanAbsoluteStep(values.reverse())
  const { stable, moderate } = parameter.stability
  const status = fluctuation <= stable ? "stable" : fluctuation <= moderate ? "moderate" : "fluctuating"
  return { samples: values.length, fluctuation, status }
}
