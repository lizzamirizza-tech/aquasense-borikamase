import { toneOf } from "../utils/tone.js"
import { QUALITY_ICON, QUALITY_TONE } from "../utils/waterQuality.js"
import { isErrorStatus, isOkStatus } from "../utils/sensorHealth.js"

export function StatusDot({ tone = "neutral", pulse = false, className = "" }) {
  const t = toneOf(tone)
  return (
    <span className={`relative inline-flex h-2 w-2 shrink-0 ${className}`} aria-hidden="true">
      {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${t.dot}`} />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${t.dot}`} />
    </span>
  )
}

export default function StatusBadge({ tone = "neutral", pulse = false, size = "md", icon, children, className = "", title }) {
  const t = toneOf(tone)
  const sizeClasses = size === "sm" ? "gap-1.5 px-2 py-0.5 text-[11px]" : size === "lg" ? "gap-2 px-3 py-1.5 text-sm" : "gap-1.5 px-2.5 py-1 text-xs"
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-semibold tracking-wide ${sizeClasses} ${t.bg} ${t.text} ${t.border} ${className}`}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : <StatusDot tone={tone} pulse={pulse} />}
      {children}
    </span>
  )
}

export function QualityBadge({ quality, size = "sm" }) {
  if (!quality) return <span className="text-xs text-ink-faint">—</span>
  return (
    <StatusBadge tone={QUALITY_TONE[quality]} size={size} icon={QUALITY_ICON[quality]}>
      {quality}
    </StatusBadge>
  )
}

export function SensorStatusBadge({ status, size = "sm" }) {
  if (!status) return <span className="text-xs text-ink-faint">—</span>
  const tone = isErrorStatus(status) ? "danger" : isOkStatus(status) ? "good" : "neutral"
  const icon = tone === "danger" ? "✕" : tone === "good" ? "✓" : "○"
  return (
    <StatusBadge tone={tone} size={size} icon={icon} title={tone === "neutral" ? "Status not reported by the device" : undefined}>
      {status}
    </StatusBadge>
  )
}

export function SessionBadge({ session }) {
  if (!session) return <span className="text-xs text-ink-faint">—</span>
  const outside = !["Pagi", "Siang", "Sore"].includes(session)
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
        outside ? "border-line text-ink-faint" : "border-accent-line bg-accent-soft text-accent-strong"
      }`}
    >
      {session}
    </span>
  )
}
