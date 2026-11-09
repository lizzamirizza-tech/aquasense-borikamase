import { Inbox } from "lucide-react"

export default function EmptyState({ icon: Icon = Inbox, title, description, action, tone = "neutral", className = "" }) {
  const isError = tone === "error"
  return (
    <div
      role={isError ? "alert" : undefined}
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center ${
        isError ? "border-danger-border bg-danger-bg/50" : "border-line-strong bg-surface-alt"
      } ${className}`}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface">
        <Icon className={`h-5 w-5 ${isError ? "text-danger" : "text-ink-faint"}`} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

// Loading placeholder — never a fake value.
export function Skeleton({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block overflow-hidden rounded-md bg-line/70 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent ${className}`}
    />
  )
}

export function LoadingBlock({ label = "Loading…", className = "" }) {
  return (
    <div role="status" className={`flex flex-col gap-3 ${className}`}>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  )
}
