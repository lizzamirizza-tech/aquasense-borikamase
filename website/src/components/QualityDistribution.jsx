import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { useChartPalette } from "../context/ThemeContext.jsx"
import { formatCount, formatPercent } from "../utils/format.js"
import { QUALITY_ICON } from "../utils/waterQuality.js"

// Donut of GOOD / WARNING / DANGER counts, with a legend table carrying the
// numbers (identity never relies on color alone).
export default function QualityDistribution({ summary }) {
  const c = useChartPalette()
  const total = summary?.total ?? 0
  const data = ["GOOD", "WARNING", "DANGER"].map((q) => ({ name: q, value: summary?.[q.toLowerCase()] ?? 0 }))

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-[180px] w-[180px]">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 2 : 0}
                stroke={c.surface}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data
                  .filter((d) => d.value > 0)
                  .map((d) => (
                    <Cell key={d.name} fill={c.quality[d.name]} />
                  ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-card-hover">
                      <p className="font-semibold text-ink">{payload[0].name}</p>
                      <p className="font-mono text-ink-soft">
                        {formatCount(payload[0].value)} · {formatPercent(payload[0].value, total)}
                      </p>
                    </div>
                  ) : null
                }
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-full border-[26px] border-line" aria-hidden="true" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold text-ink font-tabular">{formatCount(total)}</span>
          <span className="text-[11px] text-ink-faint">readings</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <caption className="sr-only">Water quality distribution</caption>
        <thead>
          <tr className="text-left text-[11px] tracking-wider text-ink-faint uppercase">
            <th className="pb-2 font-semibold">Category</th>
            <th className="pb-2 text-right font-semibold">Count</th>
            <th className="pb-2 text-right font-semibold">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.name} className="border-t border-line">
              <td className="py-2">
                <span className="flex items-center gap-2 font-semibold text-ink">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: c.quality[d.name] }} aria-hidden="true" />
                  <span aria-hidden="true">{QUALITY_ICON[d.name]}</span> {d.name}
                </span>
              </td>
              <td className="py-2 text-right font-mono text-ink font-tabular">{formatCount(d.value)}</td>
              <td className="py-2 text-right font-mono text-ink-soft font-tabular">{formatPercent(d.value, total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
