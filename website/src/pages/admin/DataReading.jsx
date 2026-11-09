import { useMemo, useState } from "react"
import Section, { PageHeader, Panel } from "../../components/Section.jsx"
import { DateFilter, SessionFilter } from "../../components/Filters.jsx"
import { DistributionPanel, ReadingCounts, SensorSummary } from "../../components/ReadingStats.jsx"
import { useMonitoring } from "../../context/MonitoringContext.jsx"
import { useSummary } from "../../hooks/useAquaSense.js"
import { describeRange } from "../../utils/dateRange.js"

// Monitoring statistics for a chosen period / session (MySQL, server side).
export default function DataReading() {
  const { config } = useMonitoring()
  const [date, setDate] = useState({ rangeId: "all", from: "", to: "" })
  const [session, setSession] = useState("all")
  const filters = useMemo(() => ({ from: date.from, to: date.to, session }), [date.from, date.to, session])
  const invalid = date.from && date.to && date.from > date.to
  const summary = useSummary(invalid ? { session } : filters, { followLive: true })
  const scope = `${describeRange(date.from, date.to)} · ${session === "all" ? "all sessions" : session}`

  return (
    <div className="space-y-6">
      <PageHeader title="Data Reading" />
      <Panel className="space-y-4 p-4 sm:p-5">
        <DateFilter value={date} onChange={setDate} />
        <SessionFilter value={session} onChange={setSession} sessions={config?.sessions} outsideLabel={config?.outside_session_label} />
      </Panel>
      <Section title="Readings" description={scope}>
        <ReadingCounts state={summary} scopeLabel={scope} />
      </Section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DistributionPanel state={summary} />
        <SensorSummary state={summary} />
      </div>
    </div>
  )
}
