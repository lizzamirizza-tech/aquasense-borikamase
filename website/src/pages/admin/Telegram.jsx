import { useCallback, useEffect, useRef, useState } from "react"
import { BellOff, RefreshCw, Send, Trash2 } from "lucide-react"
import Section, { Alert, Button, PageHeader, Panel, PanelTitle } from "../../components/Section.jsx"
import EmptyState, { LoadingBlock } from "../../components/EmptyState.jsx"
import StatusBadge from "../../components/StatusBadge.jsx"
import { StatusLabel, useSystemDetails } from "../../components/SystemStatus.jsx"
import { deleteNotification, fetchNotifications, resendNotification, sendTelegramTest } from "../../services/api.js"
import { getTelegramStatus } from "../../utils/systemStatus.js"
import { formatCount, formatDateTime, formatDuration } from "../../utils/format.js"
import { displayTime, eventLabel } from "../../utils/notification.js"

const TONE = { GOOD: "good", WARNING: "warning", DANGER: "danger", ERROR: "danger", INFO: "neutral" }

// Bot state from what Node-RED actually observed: the sender node status and
// the result of the last delivery attempt in notification_log.
function getBotState(t) {
  if (!t) return { label: "Not available", tone: "neutral" }
  if (t.node_status_fill === "red" || t.last_delivery_status === "FAILED") return { label: "Gangguan", tone: "danger" }
  if (t.last_delivery_status === "SENT") return { label: "Aktif", tone: "good" }
  return { label: "Belum mengirim", tone: "neutral" }
}

export default function Telegram() {
  const system = useSystemDetails(true)
  const [log, setLog] = useState({ status: "loading", rows: [], error: null })

  const load = useCallback(() => {
    setLog((prev) => ({ ...prev, status: prev.rows.length ? "refreshing" : "loading" }))
    fetchNotifications(100)
      .then((d) => setLog({ status: "ok", rows: d.rows, error: null }))
      .catch((err) => setLog((prev) => ({ status: "error", rows: prev.rows, error: err.message })))
  }, [])
  // Initial load, then poll so new notification_log rows appear automatically.
  useEffect(() => {
    let cancelled = false
    const poll = () =>
      fetchNotifications(100)
        .then((d) => !cancelled && setLog({ status: "ok", rows: d.rows, error: null }))
        .catch((err) => !cancelled && setLog((prev) => ({ status: "error", rows: prev.rows, error: err.message })))
    poll()
    const id = setInterval(poll, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const t = system.data?.telegram
  const status = getTelegramStatus(system.data)
  const [test, setTest] = useState({ status: "idle", message: null })

  function sendTest() {
    setTest({ status: "sending", message: null })
    sendTelegramTest()
      .then((d) => {
        setTest({ status: "queued", message: d.message })
        // the first attempt finishes within seconds; retries take up to ~1 min
        setTimeout(load, 5000)
      })
      .catch((err) => setTest({ status: "error", message: err.message }))
  }

  // Per-row Send / Delete. busy (a ref) blocks repeated clicks before re-render.
  const [actions, setActions] = useState({})
  const busy = useRef(new Set())
  const setAction = (id, value) => setActions((prev) => ({ ...prev, [id]: value }))

  function resend(r) {
    if (busy.current.has(r.id)) return
    busy.current.add(r.id)
    setAction(r.id, { status: "sending" })
    resendNotification(r.id)
      .then((d) => setAction(r.id, { status: "done", result: d.delivery_status, error: d.error }))
      .catch((err) => setAction(r.id, { status: "error", error: err.message }))
      .finally(() => busy.current.delete(r.id))
  }

  function remove(r) {
    if (busy.current.has(r.id)) return
    if (!window.confirm(`Hapus catatan notifikasi "${r.title}" dari riwayat?\n\nPesan yang sudah terkirim di Telegram tidak ikut terhapus.`)) return
    busy.current.add(r.id)
    setAction(r.id, { status: "deleting" })
    deleteNotification(r.id)
      .then(() => {
        setLog((prev) => ({ ...prev, rows: prev.rows.filter((x) => x.id !== r.id) }))
        setAction(r.id, undefined)
      })
      .catch((err) => setAction(r.id, { status: "error", error: err.message }))
      .finally(() => busy.current.delete(r.id))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telegram Notification"
        actions={
          <Button size="sm" icon={Send} onClick={sendTest} disabled={test.status === "sending"}>
            {test.status === "sending" ? "Mengirim…" : "Kirim pesan uji"}
          </Button>
        }
      />
      {test.message && (
        <Alert tone={test.status === "error" ? "danger" : "info"}>
          {test.message} {test.status === "queued" && "Status SENT/FAILED pada tabel di bawah adalah hasil sebenarnya."}
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          <PanelTitle>Telegram bot</PanelTitle>
          {system.status === "loading" ? (
            <LoadingBlock className="mt-3" label="Loading Telegram status…" />
          ) : (
            <>
              <p className="mt-3 text-[11px] font-semibold tracking-wider text-ink-faint uppercase">Pengiriman terakhir</p>
              <StatusLabel status={status} className="mt-1 text-sm" />
              <p className="mt-1 text-xs break-words text-ink-soft">{status.note}</p>
              <dl className="mt-3 space-y-1 text-xs">
                <div>
                  <dt className="inline text-ink-faint">Status: </dt>
                  <dd className="inline"><StatusLabel status={getBotState(t)} /></dd>
                </div>
                <div>
                  <dt className="inline text-ink-faint">Messages sent: </dt>
                  <dd className="inline font-mono text-ink">{t ? formatCount(t.sent) : "—"}</dd>
                </div>
              </dl>
            </>
          )}
        </Panel>
        <Panel className="p-5">
          <PanelTitle>Delivery</PanelTitle>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-faint">Sent</dt>
              <dd className="font-mono text-xl font-bold text-ink">{t ? formatCount(t.sent) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Failed</dt>
              <dd className="font-mono text-xl font-bold text-ink">{t ? formatCount(t.failed) : "—"}</dd>
            </div>
            <div className="col-span-2 text-xs text-ink-soft">
              Last sent: {t?.last_sent_at ? formatDateTime(new Date(t.last_sent_at)) : "—"}
            </div>
          </dl>
        </Panel>
        <Panel className="p-5">
          <PanelTitle>Kirim saat</PanelTitle>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
            <li>Status kualitas berubah</li>
            <li>Sensor error / pulih</li>
            <li>Jeda minimum {t ? formatDuration(t.cooldown_seconds) : "—"}</li>
            <li>Gagal kirim: dicoba ulang maks. 3× (jeda 15 s, 45 s)</li>
          </ul>
        </Panel>
      </div>

      <Section
        title="Notification history"
        actions={<Button size="sm" icon={RefreshCw} onClick={load} disabled={log.status === "refreshing"}>Refresh</Button>}
      >
        <Panel className="overflow-hidden">
          {log.status === "loading" ? (
            <LoadingBlock className="p-5" label="Loading notification history…" />
          ) : log.status === "error" && !log.rows.length ? (
            <EmptyState icon={BellOff} tone="error" className="m-4" title="Notification history unavailable" description={log.error} />
          ) : !log.rows.length ? (
            <EmptyState icon={BellOff} className="m-4" title="No notifications yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-surface-alt">
                  <tr className="text-left text-[11px] tracking-wider text-ink-soft uppercase">
                    <th className="px-4 py-2.5 font-semibold">Sent (WITA)</th>
                    <th className="px-3 py-2.5 font-semibold">Event</th>
                    <th className="px-3 py-2.5 font-semibold">Severity</th>
                    <th className="px-3 py-2.5 font-semibold">Title</th>
                    <th className="px-3 py-2.5 font-semibold">Delivery</th>
                    <th className="px-3 py-2.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...log.rows].sort((a, b) => displayTime(b) - displayTime(a) || b.id - a.id).map((r) => (
                    <tr key={r.id} className="border-t border-line align-top">
                      <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-ink">{formatDateTime(displayTime(r))}</td>
                      <td className="px-3 py-2.5 text-xs text-ink-soft">
                        {eventLabel(r)}
                        {r.previous_quality && r.water_quality && r.previous_quality !== r.water_quality && (
                          <span className="block font-mono text-ink">{r.previous_quality} → {r.water_quality}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge tone={TONE[r.severity] ?? "neutral"} size="sm">{r.severity}</StatusBadge>
                      </td>
                      <td className="px-3 py-2.5 text-ink">
                        {r.title}
                        {r.message && (
                          <details className="mt-1 text-xs text-ink-soft">
                            <summary className="cursor-pointer text-accent">Message</summary>
                            <pre className="mt-1 font-sans whitespace-pre-wrap">{r.message}</pre>
                          </details>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge tone={r.delivery_status === "SENT" ? "good" : "danger"} size="sm" icon={r.delivery_status === "SENT" ? "✓" : "✕"}>
                          {r.delivery_status}
                        </StatusBadge>
                        {r.error && <p className="mt-1 max-w-56 text-xs break-words text-danger">{r.error}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-2">
                          <Button size="sm" icon={Send} onClick={() => resend(r)} disabled={!r.message || !!actions[r.id]?.status?.endsWith("ing")}>
                            {actions[r.id]?.status === "sending" ? "Mengirim…" : "Send"}
                          </Button>
                          <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(r)} disabled={!!actions[r.id]?.status?.endsWith("ing")}>
                            {actions[r.id]?.status === "deleting" ? "Menghapus…" : "Delete"}
                          </Button>
                        </div>
                        {actions[r.id]?.status === "done" && (
                          <div className="mt-1.5">
                            <StatusBadge tone={actions[r.id].result === "SENT" ? "good" : "danger"} size="sm" icon={actions[r.id].result === "SENT" ? "✓" : "✕"}>
                              {actions[r.id].result}
                            </StatusBadge>
                          </div>
                        )}
                        {actions[r.id]?.error && <p className="mt-1 max-w-56 text-xs break-words text-danger">{actions[r.id].error}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </Section>
    </div>
  )
}
