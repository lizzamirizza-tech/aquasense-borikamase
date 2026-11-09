import CurrentQuality from "../../components/CurrentQuality.jsx"
import SensorGrid from "../../components/SensorGrid.jsx"
import RealtimeCharts from "../../components/RealTimeMonitoring.jsx"
import Section, { PageHeader } from "../../components/Section.jsx"
import { StatusLabel, useComponentStatus } from "../../components/SystemStatus.jsx"
import { useMonitoring } from "../../context/MonitoringContext.jsx"
import { useNow } from "../../hooks/useAquaSense.js"
import { formatRelative } from "../../utils/format.js"

export default function RealtimeMonitoring() {
  const { status } = useComponentStatus()
  const { lastMessageAt } = useMonitoring()
  const now = useNow(1000)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Real-Time Monitoring"
        actions={
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-xs">
            <span className="font-semibold text-ink">Auto refresh</span>
            <StatusLabel status={status.websocket} />
            <span className="text-ink-faint">{lastMessageAt ? `Last push ${formatRelative(lastMessageAt, now)}` : "🟡 Waiting for new data"}</span>
          </div>
        }
      />
      <CurrentQuality />
      <Section title="Sensor">
        <SensorGrid />
      </Section>
      <Section title="Raw vs filtered">
        <RealtimeCharts columns="xl:grid-cols-1 2xl:grid-cols-3" />
      </Section>
    </div>
  )
}
