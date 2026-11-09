import { Link } from "react-router-dom"
import { ArrowRight, History } from "lucide-react"
import CurrentQuality from "../../components/CurrentQuality.jsx"
import SensorGrid from "../../components/SensorGrid.jsx"
import RealtimeCharts from "../../components/RealTimeMonitoring.jsx"
import Section, { PageHeader } from "../../components/Section.jsx"
import { DistributionPanel, ReadingCounts, SensorSummary } from "../../components/ReadingStats.jsx"
import { SystemStatusGrid, useComponentStatus } from "../../components/SystemStatus.jsx"
import { useSummary } from "../../hooks/useAquaSense.js"

const ALL_TIME = {}

// Order: quality → live state → sensors → reading statistics → distribution
// → sensor summary → realtime charts → system status. No full history table.
export default function Dashboard() {
  const all = useSummary(ALL_TIME, { followLive: true })
  const { status } = useComponentStatus()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        actions={
          <Link to="/admin/history" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-accent hover:text-accent">
            <History className="h-4 w-4" aria-hidden="true" /> Monitoring history
          </Link>
        }
      />
      <CurrentQuality />
      <Section title="Sensor">
        <SensorGrid />
      </Section>
      <Section
        title="Data reading"
        actions={
          <Link to="/admin/data-reading" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Detail <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      >
        <ReadingCounts state={all} scopeLabel="all recorded readings" />
      </Section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DistributionPanel state={all} />
        <SensorSummary state={all} />
      </div>
      <Section title="Raw vs filtered">
        <RealtimeCharts />
      </Section>
      <Section
        title="System status"
        actions={
          <Link to="/admin/integration" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Details <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      >
        <SystemStatusGrid status={status} />
      </Section>
    </div>
  )
}
