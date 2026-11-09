import { FlaskConical, Gauge, Waves } from "lucide-react"

// The three monitored parameters and the API fields that carry them.
//
// gauge: display scale of the gauge widget (values beyond it are shown with
//   an "above scale" note, never clipped silently).
// stability: display-only bands for the fluctuation indicator (mean absolute
//   change of RAW values between consecutive readings, see
//   utils/statistics.js). They are NOT used for water quality classification.
export const PARAMETERS = [
  {
    key: "ph",
    label: "pH",
    name: "Derajat keasaman",
    unit: "",
    decimals: 2,
    rawKey: "ph_raw",
    filteredKey: "ph_filtered",
    icon: FlaskConical,
    gauge: { min: 0, max: 14 },
    stability: { stable: 0.05, moderate: 0.15 },
  },
  {
    key: "tds",
    label: "TDS",
    name: "Total Dissolved Solids",
    unit: "ppm",
    decimals: 1,
    rawKey: "tds_raw",
    filteredKey: "tds_filtered",
    nonNegative: true,
    icon: Gauge,
    gauge: { min: 0, max: 1000 },
    stability: { stable: 5, moderate: 15 },
  },
  {
    key: "turbidity",
    label: "Turbidity",
    name: "Kekeruhan",
    unit: "NTU",
    decimals: 2,
    rawKey: "turbidity_raw",
    filteredKey: "turbidity_filtered",
    nonNegative: true,
    icon: Waves,
    gauge: { min: 0, max: 100 },
    stability: { stable: 0.25, moderate: 0.75 },
  },
]

export const parameterByKey = Object.fromEntries(PARAMETERS.map((p) => [p.key, p]))

// Chart series colors — validated for the dark surface #111316 (dataviz
// validator: lightness band, CVD ΔE 11.9, normal-vision ΔE 19.5, ≥ 3:1 contrast).
export const SERIES_COLOR = {
  raw: "#8b74ec",
  filtered: "#1ea5b3",
}

// Recessive chart chrome (SVG attributes can't read CSS vars).
export const CHART_THEME = {
  grid: "#1c2025",
  axis: "#2d3239",
  tick: "#6c737d",
  surface: "#111316",
}

// Status colors for charts (same as the CSS status tokens).
export const QUALITY_COLOR = {
  GOOD: "#3fbf7f",
  WARNING: "#e2ad45",
  DANGER: "#f07070",
}

// Per-theme chart colors, read through useChartPalette(). The light series
// pair is validated for the white surface #ffffff (dataviz validator: all
// checks pass — CVD ΔE 14.4, normal-vision ΔE 20.5, ≥ 3:1 contrast).
export const CHART_PALETTE = {
  dark: {
    series: SERIES_COLOR,
    ...CHART_THEME,
    reference: "#4b525b",
    gaugeTrack: "#1f2328",
    gaugeValue: "#2bb8c6",
    gaugeKnob: "#e9ebee",
    quality: QUALITY_COLOR,
    zone: { good: "rgba(63,191,127,0.45)", warning: "rgba(226,173,69,0.45)", danger: "rgba(240,112,112,0.45)" },
  },
  light: {
    series: { raw: "#6a4fd6", filtered: "#0094a8" },
    grid: "#e9edf0",
    axis: "#cbd2d9",
    tick: "#69717b",
    surface: "#ffffff",
    reference: "#9aa3ad",
    gaugeTrack: "#e2e6ea",
    gaugeValue: "#0a8492",
    gaugeKnob: "#14181d",
    quality: { GOOD: "#22a066", WARNING: "#d4952a", DANGER: "#dc4c4c" },
    zone: { good: "rgba(34,160,102,0.4)", warning: "rgba(212,149,42,0.45)", danger: "rgba(220,76,76,0.4)" },
  },
}

// Oldest → newest points for one parameter, skipping readings without values.
export function toSeries(readings, parameter, limit) {
  const points = []
  for (const r of readings) {
    const raw = r[parameter.rawKey]
    const filtered = r[parameter.filteredKey]
    if (raw === null && filtered === null) continue
    points.push({ t: r.timestamp.getTime(), raw, filtered })
    if (points.length >= limit) break
  }
  return points.reverse()
}
