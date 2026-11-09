import { useState } from "react"
import { RefreshCw, TriangleAlert } from "lucide-react"
import StatCard from "./StatCard.jsx"
import QualityDistribution from "./QualityDistribution.jsx"
import { Alert, Button, Panel, PanelTitle } from "./Section.jsx"
import { LoadingBlock } from "./EmptyState.jsx"
import { PARAMETERS } from "../constants/parameters.js"
import { formatCount, formatPercent, formatValue } from "../utils/format.js"

// TOTAL / GOOD / WARNING / DANGER cards. Total = GOOD + WARNING + DANGER, as
// counted by MySQL over exactly the selected filters.
export function ReadingCounts({ state, scopeLabel }) {
  const s = state.data
  const loading = state.status === "loading"
  return (
    <div className="space-y-3">
      {state.status === "error" && (
        <Alert tone="danger" icon={TriangleAlert} action={<Button size="sm" icon={RefreshCw} onClick={state.retry}>Retry</Button>}>
          Unable to load statistics. {state.error}
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total readings" value={formatCount(s?.total)} sub={scopeLabel} loading={loading} />
        <StatCard label="Good" icon="✓" tone="good" value={formatCount(s?.good)} sub={s ? formatPercent(s.good, s.total) : null} loading={loading} />
        <StatCard label="Warning" icon="⚠" tone="warning" value={formatCount(s?.warning)} sub={s ? formatPercent(s.warning, s.total) : null} loading={loading} />
        <StatCard label="Danger" icon="🚨" tone="danger" value={formatCount(s?.danger)} sub={s ? formatPercent(s.danger, s.total) : null} loading={loading} />
      </div>
      {s?.unclassified > 0 && (
        <p className="text-xs text-ink-faint">
          {formatCount(s.unclassified)} data tanpa kategori tidak dihitung.
        </p>
      )}
    </div>
  )
}

export function DistributionPanel({ state, title = "Water quality distribution", hint }) {
  return (
    <Panel className="p-5">
      <PanelTitle hint={hint}>{title}</PanelTitle>
      <div className="mt-4">
        {state.status === "loading" ? <LoadingBlock label="Loading statistics…" /> : <QualityDistribution summary={state.data} />}
      </div>
    </Panel>
  )
}

// Average / min / max per parameter, from RAW or from Kalman-FILTERED values
// (never mixed).
export function SensorSummary({ state, hint }) {
  const [kind, setKind] = useState("filtered")
  const stats = state.data?.stats
  return (
    <Panel className="p-5">
      <PanelTitle
        hint={hint}
        right={
          <div className="inline-flex rounded-lg border border-line-strong p-0.5" role="group" aria-label="Value type">
            {[
              ["raw", "RAW"],
              ["filtered", "FILTERED"],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`min-h-8 rounded-md px-3 text-xs font-semibold ${kind === k ? "bg-accent text-on-accent" : "text-ink-soft hover:text-accent"}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        Sensor summary
      </PanelTitle>
      {state.status === "loading" ? (
        <LoadingBlock className="mt-4" label="Loading statistics…" />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-wider text-ink-faint uppercase">
                <th className="py-2 pr-3 font-semibold">Parameter</th>
                <th className="py-2 pr-3 text-right font-semibold">Average</th>
                <th className="py-2 pr-3 text-right font-semibold">Minimum</th>
                <th className="py-2 text-right font-semibold">Maximum</th>
              </tr>
            </thead>
            <tbody className="font-mono font-tabular">
              {PARAMETERS.map((p) => {
                const v = stats?.[p.key]?.[kind]
                const d = p.decimals
                return (
                  <tr key={p.key} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-3 font-sans font-semibold text-ink">
                      {p.label} {p.unit && <span className="font-normal text-ink-faint">({p.unit})</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink">{formatValue(v?.avg, d)}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-soft">{formatValue(v?.min, d)}</td>
                    <td className="py-2.5 text-right text-ink-soft">{formatValue(v?.max, d)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
