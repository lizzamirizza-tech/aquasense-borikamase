import { Panel, PanelTitle } from "./Section.jsx"
import { LoadingBlock } from "./EmptyState.jsx"
import { useMonitoring } from "../context/MonitoringContext.jsx"
import { parameterByKey } from "../constants/parameters.js"

// MONITORING THRESHOLDS — display only. The text comes from /api/config,
// which is maintained next to the Node-RED "Quality Check" node; the
// dashboard does not classify anything with it.
export default function ThresholdsTable() {
  const { config } = useMonitoring()
  const t = config?.thresholds

  return (
    <Panel className="p-5">
      <PanelTitle>Monitoring thresholds</PanelTitle>
      {!t ? (
        <LoadingBlock className="mt-4" label="Loading thresholds from the backend…" />
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wider uppercase">
                  <th className="py-2 pr-3 font-semibold text-ink-faint">Parameter</th>
                  <th className="py-2 pr-3 font-semibold text-good">✓ Good</th>
                  <th className="py-2 pr-3 font-semibold text-warning">⚠ Warning</th>
                  <th className="py-2 font-semibold text-danger">🚨 Danger</th>
                </tr>
              </thead>
              <tbody className="font-mono text-ink">
                {t.rules.map((r) => {
                  const unit = r.unit ? ` ${r.unit}` : ""
                  return (
                    <tr key={r.parameter} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-3 font-sans font-semibold">{parameterByKey[r.parameter]?.label ?? r.parameter}</td>
                      <td className="py-2.5 pr-3">{r.good}{unit}</td>
                      <td className="py-2.5 pr-3">{r.warning === "—" ? "—" : `${r.warning}${unit}`}</td>
                      <td className="py-2.5">{r.danger}{unit}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <details className="mt-3 text-xs text-ink-soft">
            <summary className="cursor-pointer text-ink-faint hover:text-accent">Urutan evaluasi</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              {t.evaluationOrder.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </details>
        </>
      )}
    </Panel>
  )
}
