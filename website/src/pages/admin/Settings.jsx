import { useState } from "react"
import { Check } from "lucide-react"
import { Button, PageHeader, Panel, PanelTitle } from "../../components/Section.jsx"
import { SelectField } from "../../components/Filters.jsx"
import { LoadingBlock } from "../../components/EmptyState.jsx"
import ThresholdsTable from "../../components/ThresholdsTable.jsx"
import { useMonitoring } from "../../context/MonitoringContext.jsx"
import { formatDuration } from "../../utils/format.js"
import { readPrefs, writePrefs } from "../../utils/prefs.js"
import { useTheme } from "../../context/ThemeContext.jsx"
import { CHART_PERIODS } from "../../hooks/useSeries.js"

export default function Settings() {
  const { config } = useMonitoring()
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = useState(readPrefs)
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(writePrefs(prefs))
  }

  const rows = config && [
    ["Device ID", config.device_id],
    ["Sampling interval", formatDuration(config.sampling_interval_seconds)],
    ["LIVE freshness threshold", formatDuration(config.freshness_threshold_seconds)],
    ["Timezone", `${config.timezone} (${config.timezone_label})`],
    ["Sessions", config.sessions.map((s) => `${s.name} ${s.startHour}:00–${s.endHour - 1}:59`).join(" · ")],
    ["Outside sessions", config.outside_session_label],
    ["Telegram cooldown", formatDuration(config.telegram_cooldown_seconds)],
    ["Minimum password length", `${config.min_password_length} characters`],
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <Panel className="p-5">
        <PanelTitle hint="Diatur di Node-RED">Monitoring configuration</PanelTitle>
        {!rows ? (
          <LoadingBlock className="mt-3" label="Loading configuration…" />
        ) : (
          <dl className="mt-3 divide-y divide-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-6">
                <dt className="text-sm text-ink-soft">{k}</dt>
                <dd className="text-sm font-semibold text-ink sm:text-right">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>

      <ThresholdsTable />

      <Panel className="p-5">
        <PanelTitle>Display</PanelTitle>
        <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2">
          <SelectField
            label="Default chart period"
            value={prefs.chartPeriod}
            onChange={(v) => {
              setPrefs({ ...prefs, chartPeriod: v })
              setSaved(false)
            }}
            options={CHART_PERIODS.filter((p) => p.id !== "custom").map((p) => ({ value: p.id, label: p.label }))}
          />
          <SelectField
            label="Theme (applied immediately)"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
          />
        </div>
        <Button variant="primary" className="mt-4" icon={saved ? Check : undefined} onClick={save}>
          {saved ? "Saved" : "Save preferences"}
        </Button>
      </Panel>
    </div>
  )
}
