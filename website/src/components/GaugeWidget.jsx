import { useId } from "react"
import { formatValue } from "../utils/format.js"
import { useChartPalette } from "../context/ThemeContext.jsx"

// Semicircle gauge. `zones` are display bands built from the thresholds that
// /api/config reports for the Node-RED Quality Check — they color the scale
// only and never classify the value. The needle shows the FILTERED value.
const START = -180
const END = 0
const R = 80
const CX = 100
const CY = 96

function polar(angle, r = R) {
  const rad = (angle * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

function arc(a0, a1, r = R) {
  const [x0, y0] = polar(a0, r)
  const [x1, y1] = polar(a1, r)
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
}

export default function GaugeWidget({ value, min, max, zones = [], decimals = 1, unit = "", label }) {
  const id = useId()
  const c = useChartPalette()
  const toAngle = (v) => START + ((Math.min(Math.max(v, min), max) - min) / (max - min)) * (END - START)
  const has = value !== null && value !== undefined && Number.isFinite(value)
  const above = has && value > max
  const angle = has ? toAngle(value) : null

  return (
    <figure className="relative mx-auto w-full max-w-[220px]" aria-labelledby={`${id}-cap`}>
      <svg viewBox="0 0 200 112" className="w-full" aria-hidden="true">
        <path d={arc(START, END)} fill="none" stroke={c.gaugeTrack} strokeWidth="14" strokeLinecap="round" />
        {zones.map((z, i) => (
          <path key={i} d={arc(toAngle(z.from), toAngle(z.to))} fill="none" stroke={c.zone[z.tone]} strokeWidth="14" />
        ))}
        {has && <path d={arc(START, angle, R - 13)} fill="none" stroke={c.gaugeValue} strokeWidth="4" strokeLinecap="round" />}
        {/* value marker on the scale (no center needle, so the number stays readable) */}
        {has && <circle cx={polar(angle)[0]} cy={polar(angle)[1]} r="8.5" fill={c.gaugeKnob} stroke={c.surface} strokeWidth="3" />}
        <text x={polar(START, R)[0]} y={CY + 14} textAnchor="middle" fontSize="10" fill={c.tick}>{min}</text>
        <text x={polar(END, R)[0]} y={CY + 14} textAnchor="middle" fontSize="10" fill={c.tick}>{max}</text>
      </svg>
      <figcaption id={`${id}-cap`} className="-mt-10 text-center">
        <span className="sr-only">{label} filtered value </span>
        <span className="font-mono text-3xl font-bold tracking-tight text-ink font-tabular">{has ? formatValue(value, decimals) : "—"}</span>
        {unit && <span className="ml-1 text-sm font-medium text-ink-soft">{unit}</span>}
        {above && <span className="block text-[11px] font-medium text-warning">▲ above gauge scale ({max})</span>}
      </figcaption>
    </figure>
  )
}

// Display bands from the configured thresholds (see set-config in Node-RED).
// eslint-disable-next-line react-refresh/only-export-components
export function zonesFor(parameter, rule) {
  const { min, max } = parameter.gauge
  if (!rule) return []
  if (rule.goodMin !== undefined) {
    return [
      { from: min, to: rule.goodMin, tone: "danger" },
      { from: rule.goodMin, to: rule.goodMax, tone: "good" },
      { from: rule.goodMax, to: max, tone: "danger" },
    ]
  }
  return [
    { from: min, to: Math.min(rule.goodBelow, max), tone: "good" },
    { from: Math.min(rule.goodBelow, max), to: Math.min(rule.warningBelow, max), tone: "warning" },
    { from: Math.min(rule.warningBelow, max), to: max, tone: "danger" },
  ].filter((z) => z.to > z.from)
}
