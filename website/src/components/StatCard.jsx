import { Skeleton } from "./EmptyState.jsx"
import { toneOf } from "../utils/tone.js"

export default function StatCard({ label, value, sub, tone, icon, loading = false }) {
  const t = tone ? toneOf(tone) : null
  return (
    <div className={`min-w-0 rounded-2xl border bg-surface p-4 shadow-card sm:p-5 ${t ? t.border : "border-line"}`}>
      <p className={`flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase ${t ? t.text : "text-ink-faint"}`}>
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className="mt-1 font-mono text-2xl font-bold text-ink font-tabular sm:text-3xl">{value}</p>
      )}
      {sub && !loading && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </div>
  )
}
