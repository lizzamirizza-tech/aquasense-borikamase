import { CalendarDays } from "lucide-react"
import { QUICK_RANGES, rangeFor, todayKey } from "../utils/dateRange.js"

const fieldClass =
  "min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"

// Quick ranges + a calendar date range (WITA days). Native date inputs give a
// touch-friendly calendar on phones.
export function DateFilter({ value, onChange }) {
  const today = todayKey()
  const setQuick = (id) => {
    if (id === "custom") onChange({ ...value, rangeId: "custom", from: value.from || today, to: value.to || today })
    else onChange({ rangeId: id, ...rangeFor(id) })
  }
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Date (WITA)
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={value.rangeId === r.id}
            onClick={() => setQuick(r.id)}
            className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
              value.rangeId === r.id ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-ink-soft hover:border-accent hover:text-accent"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {value.rangeId === "custom" && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-sm">
          <label className="text-xs text-ink-soft">
            From
            <input
              type="date"
              className={`${fieldClass} mt-1`}
              value={value.from}
              max={value.to || today}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </label>
          <label className="text-xs text-ink-soft">
            To
            <input
              type="date"
              className={`${fieldClass} mt-1`}
              value={value.to}
              min={value.from || undefined}
              max={today}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </label>
        </div>
      )}
    </fieldset>
  )
}

// Sessions come from /api/config (derived in Node-RED from the WITA hour).
export function SessionFilter({ value, onChange, sessions, outsideLabel }) {
  const options = [
    { id: "all", label: "All Sessions" },
    ...(sessions ?? []).map((s) => ({ id: s.name, label: s.name, hint: `${pad(s.startHour)}:00–${pad(s.endHour - 1)}:59` })),
    ...(outsideLabel ? [{ id: outsideLabel, label: outsideLabel }] : []),
  ]
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-semibold text-ink-soft">Session</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            title={o.hint ? `${o.hint} WITA` : undefined}
            className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
              value === o.id ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-ink-soft hover:border-accent hover:text-accent"
            }`}
          >
            {o.label}
            {o.hint && <span className={`ml-1 font-normal ${value === o.id ? "text-on-accent/70" : "text-ink-faint"}`}>{o.hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function SelectField({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`block text-xs font-semibold text-ink-soft ${className}`}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} mt-1.5`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export { fieldClass }

const pad = (n) => String(n).padStart(2, "0")
