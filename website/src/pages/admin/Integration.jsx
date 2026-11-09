import { TriangleAlert } from "lucide-react"
import Section, { Alert, PageHeader, Panel } from "../../components/Section.jsx"
import { PipelineDiagram, SystemInformation, SystemStatusGrid, useComponentStatus } from "../../components/SystemStatus.jsx"
import { useMonitoring } from "../../context/MonitoringContext.jsx"
import { formatCount, formatDateTime } from "../../utils/format.js"

export default function Integration() {
  const { status, system } = useComponentStatus()
  const { latest } = useMonitoring()
  const p = system.data?.pipeline

  return (
    <div className="space-y-8">
      <PageHeader
        title="System Integration"
      />
      <Panel className="p-4 sm:p-5">
        <PipelineDiagram status={status} hasFilteredData={latest?.ph_filtered != null} />
      </Panel>
      <Section title="Component status">
        <SystemStatusGrid status={status} />
      </Section>
      <Section title="Pipeline" description="Sejak Node-RED terakhir dijalankan">
        {system.status === "error" ? (
          <Alert tone="danger" icon={TriangleAlert}>
            Runtime details unavailable. {system.error}
          </Alert>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Counter label="MQTT messages" value={p ? formatCount(p.messages_received) : "—"} />
            <Counter label="Valid readings" value={p ? formatCount(p.valid_readings) : "—"} />
            <Counter label="Rejected payloads" value={p ? formatCount(p.rejected_payloads) : "—"} note="ditolak validasi" />
            <Counter label="Counting since" value={p?.since ? formatDateTime(new Date(p.since)) : "—"} small />
          </div>
        )}
      </Section>
      <SystemInformation />
    </div>
  )
}

function Counter({ label, value, note, small }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">{label}</p>
      <p className={`mt-1 font-mono font-bold text-ink font-tabular ${small ? "text-sm" : "text-2xl"}`}>{value}</p>
      {note && <p className="text-xs text-ink-faint">{note}</p>}
    </div>
  )
}
