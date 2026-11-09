import { useId } from "react"

// Custom AquaSense mark: a water droplet silhouette (aqua) containing a
// sensor waveform — a pulse line with a terminal data node — so the symbol
// reads simultaneously as "water" and "sensing / signal", not a generic
// stock droplet icon.
const DROPLET_PATH =
  "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"

export function LogoMark({ size = 36, className = "" }) {
  const gradientId = useId()

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="AquaSense symbol"
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0e7490" />
          <stop offset="1" stopColor="#2dd4e0" />
        </linearGradient>
      </defs>
      <path d={DROPLET_PATH} fill={`url(#${gradientId})`} />
      <polyline
        points="6.3,14.6 8.5,14.6 9.9,11.9 11.5,16.6 13,13 14.5,14.6 17.6,14.6"
        fill="none"
        stroke="#e3fbff"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <circle cx="17.6" cy="14.6" r="2" fill="none" stroke="#9af1ff" strokeWidth="0.55" opacity="0.55" />
      <circle cx="17.6" cy="14.6" r="1" fill="#9af1ff" />
    </svg>
  )
}

export default function Logo({ size = 34, showTagline = false, dark = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0" />
      <div className="leading-tight">
        <div
          className={`font-bold tracking-tight whitespace-nowrap ${dark ? "text-white" : "text-ink"}`}
          style={{ fontSize: size * 0.5 }}
        >
          Aqua<span className={dark ? "text-aqua-300" : "text-accent"}>Sense</span>
        </div>
        {showTagline && (
          <div className={`text-[11px] font-medium tracking-wide whitespace-nowrap ${dark ? "text-navy-300" : "text-ink-soft"}`}>
            Water Quality Monitoring
          </div>
        )}
      </div>
    </div>
  )
}
