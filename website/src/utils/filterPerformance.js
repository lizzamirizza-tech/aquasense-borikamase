import { witaDateKey } from "./format.js"

// Filter Performance Evaluation, computed from stored RAW / FILTERED pairs.
//
// rows: readings of the selected period and sessions, oldest → newest. RAW
// and FILTERED of a row come from the same stored record, so they are always
// a pair of the same measurement.
//
//  SD         population standard deviation (divide by n) over every row with
//             both values — the method that reproduces the reference results.
//  SD reduction (%)          = (SD raw − SD filtered) / SD raw × 100
//  Fluctuation               = mean |x[i] − x[i−1]| of consecutive readings
//             of the same device, observation session and WITA date. Pairs
//             are never formed across a session or day break, nor across a
//             reading where either value is missing.
//  Fluctuation reduction (%) = (F raw − F filtered) / F raw × 100
//
// A value that cannot be computed (no data, division by zero) is null.

const isNum = (v) => typeof v === "number" && Number.isFinite(v)

function populationSd(values) {
  if (!values.length) return null
  let mean = 0
  for (const v of values) mean += v
  mean /= values.length
  let sum = 0
  for (const v of values) sum += (v - mean) ** 2
  return Math.sqrt(sum / values.length)
}

const reduction = (raw, filtered) => (isNum(raw) && isNum(filtered) && raw > 0 ? ((raw - filtered) / raw) * 100 : null)

export function computeFilterPerformance(rows, parameter) {
  const raws = []
  const filtereds = []
  let fluctRaw = 0
  let fluctFiltered = 0
  let steps = 0
  let prev = null
  let prevGroup = null

  for (const r of rows) {
    const raw = r[parameter.rawKey]
    const filtered = r[parameter.filteredKey]
    const valid = isNum(raw) && isNum(filtered)
    const group = `${r.device_id ?? ""}|${r.session ?? ""}|${witaDateKey(r.timestamp)}`
    if (!valid) {
      prev = null // never bridge a missing value
      continue
    }
    raws.push(raw)
    filtereds.push(filtered)
    if (prev && prevGroup === group) {
      fluctRaw += Math.abs(raw - prev.raw)
      fluctFiltered += Math.abs(filtered - prev.filtered)
      steps += 1
    }
    prev = { raw, filtered }
    prevGroup = group
  }

  const sdRaw = populationSd(raws)
  const sdFiltered = populationSd(filtereds)
  const fRaw = steps ? fluctRaw / steps : null
  const fFiltered = steps ? fluctFiltered / steps : null
  return {
    sdRaw,
    sdFiltered,
    sdReduction: reduction(sdRaw, sdFiltered),
    fluctRaw: fRaw,
    fluctFiltered: fFiltered,
    fluctReduction: reduction(fRaw, fFiltered),
  }
}
