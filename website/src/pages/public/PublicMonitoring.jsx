import { Link } from "react-router-dom";
import { History } from "lucide-react";
import CurrentQuality from "../../components/CurrentQuality.jsx";
import SensorGrid from "../../components/SensorGrid.jsx";
import RealtimeCharts from "../../components/RealTimeMonitoring.jsx";
import ThresholdsTable from "../../components/ThresholdsTable.jsx";
import Section, { PageHeader } from "../../components/Section.jsx";
import {
  DistributionPanel,
  ReadingCounts,
} from "../../components/ReadingStats.jsx";
import { useSummary } from "../../hooks/useAquaSense.js";
import { rangeFor } from "../../utils/dateRange.js";

// Community monitoring page — no login required.
export default function PublicMonitoring() {
  const today = useSummary(rangeFor("today"), { followLive: true });
  return (
    <div className="space-y-8">
      <PageHeader
        title="Kualitas Air Desa Borikamase"
        actions={
          <Link
            to="/history"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-semibold text-ink hover:border-accent hover:text-accent"
          >
            <History className="h-4 w-4" aria-hidden="true" /> Monitoring
            history
          </Link>
        }
      />
      <CurrentQuality />
      <Section title="Sensor">
        <SensorGrid />
      </Section>
      <Section title="Today">
        <ReadingCounts state={today} scopeLabel="today" />
      </Section>
      <Section title="Raw vs filtered">
        <RealtimeCharts />
      </Section>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionPanel state={today} />
        <ThresholdsTable />
      </div>
    </div>
  );
}
