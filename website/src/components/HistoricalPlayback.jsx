import { useEffect, useMemo, useRef, useState } from "react"
import { Activity, History, Pause, Play, RotateCcw, TriangleAlert } from "lucide-react"
import { Button, Panel, PanelTitle } from "./Section.jsx"
import RawFilteredChart, { SeriesLegend } from "./RawFilteredChart.jsx"
import EmptyState, { LoadingBlock } from "./EmptyState.jsx"
import { fetchReadings } from "../services/api.js"
import { PARAMETERS } from "../constants/parameters.js"
import { formatCount, formatDate, formatTime } from "../utils/format.js"

const SPEEDS = [1, 2, 5, 10]
const STEP_MS = 1000 // 1x = 1 stored reading per second
const PAGE_SIZE = 200 // history.maxPageSize of /api/water/readings
const PLAYBACK_MAX = 1000 // newest readings of the filter result that are played

// Newest PLAYBACK_MAX readings matching `filters`, returned oldest → newest.
// Read-only: the same /api/water/readings endpoint and filters as the table.
async function loadPlaybackRows(filters, signal) {
  const first = await fetchReadings({ ...filters, page: 1, pageSize: PAGE_SIZE }, { signal })
  const pages = Math.min(first.total_pages ?? 1, Math.ceil(PLAYBACK_MAX / PAGE_SIZE))
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => fetchReadings({ ...filters, page: i + 2, pageSize: PAGE_SIZE }, { signal })),
  )
  const rows = [first, ...rest].flatMap((d) => d.rows).slice(0, PLAYBACK_MAX)
  return { rows: rows.reverse(), total: first.total ?? rows.length }
}

// Chart points of the first `count` readings. Every chart is cut at the same
// reading, so pH, TDS and turbidity always end on the same timestamp.
function seriesUpTo(rows, count, parameter) {
  const points = []
  for (let i = 0; i < count; i++) {
    const r = rows[i]
    const raw = r[parameter.rawKey]
    const filtered = r[parameter.filteredKey]
    if (raw === null && filtered === null) continue
    points.push({ t: r.timestamp.getTime(), raw, filtered })
  }
  return points
}

// Historical Playback: replays stored readings of the active filters on the
// raw vs filtered charts, one reading per step, using their original
// timestamps. Only these charts move — statistics, metrics and the table are
// untouched. Nothing is written back; this is not live sensor data.
// The parent remounts it (key) when the filters change.
export default function HistoricalPlayback({ filters }) {
  const [data, setData] = useState({ status: "idle", rows: [], total: 0, error: null })
  const [cursor, setCursor] = useState(0) // readings shown
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const controllerRef = useRef(null)

  const count = data.rows.length
  const ended = count > 0 && cursor >= count
  const running = playing && data.status === "ok" && !ended

  useEffect(() => () => controllerRef.current?.abort(), [])

  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => setCursor((c) => Math.min(c + 1, count)), STEP_MS / speed)
    return () => clearInterval(id)
  }, [running, speed, count])

  async function handlePlay() {
    if (data.status === "ok") {
      setCursor((c) => Math.max(c, 1))
      setPlaying(true)
      return
    }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setData({ status: "loading", rows: [], total: 0, error: null })
    try {
      const { rows, total } = await loadPlaybackRows(filters, controller.signal)
      setData({ status: "ok", rows, total, error: null })
      setCursor(rows.length ? 1 : 0)
      setPlaying(rows.length > 0)
    } catch (err) {
      if (!controller.signal.aborted) setData({ status: "error", rows: [], total: 0, error: err.message })
    }
  }

  function handleReset() {
    setPlaying(false)
    setCursor(0)
  }

  const charts = useMemo(
    () => PARAMETERS.map((parameter) => ({ parameter, points: seriesUpTo(data.rows, cursor, parameter) })),
    [data.rows, cursor],
  )
  const current = cursor > 0 ? data.rows[cursor - 1] : null

  return (
    <section aria-label="Historical Playback" className="space-y-4">
      <Panel className="p-4 sm:p-5">
        <PanelTitle
          hint="Pemutaran ulang data historis tersimpan sesuai filter aktif, untuk demonstrasi. Bukan data sensor realtime."
          right={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
              <History className="h-3.5 w-3.5" aria-hidden="true" /> Bukan realtime
            </span>
          }
        >
          Historical Playback
        </PanelTitle>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="primary" icon={Play} onClick={handlePlay} disabled={running || ended || data.status === "loading"}>
              Play
            </Button>
            <Button size="sm" icon={Pause} onClick={() => setPlaying(false)} disabled={!running}>
              Pause
            </Button>
            <Button size="sm" icon={RotateCcw} onClick={handleReset} disabled={cursor === 0 && !playing}>
              Reset
            </Button>
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Kecepatan playback">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={speed === s}
                  onClick={() => setSpeed(s)}
                  className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
                    speed === s ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-ink-soft hover:border-accent hover:text-accent"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
          <SeriesLegend />
        </div>

        <p className="mt-3 text-xs text-ink-faint" aria-live="polite">
          {data.status === "idle" && "Tekan ▶ Play untuk memutar data historis hasil filter pada grafik."}
          {data.status === "loading" && "Memuat data historis…"}
          {data.status === "ok" &&
            (count === 0
              ? "Tidak ada data pada filter ini."
              : `${current ? `Posisi: ${formatDate(current.timestamp)} ${formatTime(current.timestamp)} WITA · ` : ""}data ${formatCount(cursor)} / ${formatCount(count)}${
                  data.total > count ? ` (${formatCount(count)} pembacaan terakhir dari ${formatCount(data.total)})` : ""
                }${ended ? " · selesai — tekan Reset untuk mengulang" : ""}${!running && !ended && cursor > 0 ? " · dijeda" : ""}`)}
        </p>
      </Panel>

      {data.status === "error" ? (
        <EmptyState icon={TriangleAlert} tone="error" title="Data playback tidak dapat dimuat" description={data.error} />
      ) : (
        charts.map(({ parameter, points }) => (
          <Panel key={parameter.key} className="p-4 sm:p-5">
            <PanelTitle hint="Historical Playback">
              {parameter.label} — raw vs filtered
              {parameter.unit && <span className="ml-1 font-normal text-ink-faint">({parameter.unit})</span>}
            </PanelTitle>
            <div className="mt-4">
              {data.status === "loading" ? (
                <LoadingBlock label="Memuat data historis…" className="h-[240px] justify-center" />
              ) : points.length >= 2 ? (
                <RawFilteredChart data={points} parameter={parameter} height={240} />
              ) : (
                <EmptyState
                  icon={Activity}
                  className="h-[240px]"
                  title={data.status === "ok" && count === 0 ? "Tidak ada data pada filter ini" : "Grafik playback belum diputar"}
                  description={data.status === "ok" && count === 0 ? null : "Grafik terisi bertahap sesuai urutan timestamp setelah ▶ Play ditekan."}
                />
              )}
            </div>
          </Panel>
        ))
      )}
    </section>
  )
}
