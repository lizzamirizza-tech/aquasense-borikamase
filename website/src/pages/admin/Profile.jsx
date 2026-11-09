import { useEffect, useRef, useState } from "react"
import { Camera, Check, Eye, EyeOff, KeyRound, LogOut, Save, Trash2, TriangleAlert, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Alert, Button, PageHeader, Panel, PanelTitle } from "../../components/Section.jsx"
import ProfileAvatar, { displayNameOf, usernameOf } from "../../components/ProfileAvatar.jsx"
import { fieldClass } from "../../components/Filters.jsx"
import { useAuth } from "../../context/AuthContext.jsx"
import { useMonitoring } from "../../context/MonitoringContext.jsx"
import * as api from "../../services/api.js"
import { resizePhoto, validatePhotoFile } from "../../utils/image.js"
import { formatDateTime } from "../../utils/format.js"

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        actions={
          <Button
            variant="danger"
            icon={LogOut}
            onClick={async () => {
              await logout()
              navigate("/login", { replace: true, state: { loggedOut: true } })
            }}
          >
            Logout
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <PhotoCard user={user} />
        <div className="min-w-0 space-y-6">
          <ProfileForm key={`${user?.username}|${user?.display_name}|${user?.email}`} user={user} />
          <PasswordForm />
          <ActivityCard />
        </div>
      </div>
    </div>
  )
}

function Feedback({ result }) {
  if (!result) return null
  return (
    <Alert tone={result.ok ? "good" : "danger"} icon={result.ok ? Check : TriangleAlert} className="mt-4">
      {result.message}
    </Alert>
  )
}

// ---------------------------------------------------------------- photo
function PhotoCard({ user }) {
  const { refreshUser } = useAuth()
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null) // resized data URL awaiting save
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ""
    setResult(null)
    const problem = validatePhotoFile(file)
    if (problem) return setResult({ ok: false, message: problem })
    try {
      setPreview(await resizePhoto(file))
    } catch (err) {
      setResult({ ok: false, message: err.message })
    }
  }

  async function save() {
    setBusy(true)
    try {
      await api.uploadPhoto(preview)
      await refreshUser()
      setPreview(null)
      setResult({ ok: true, message: "Foto profil berhasil diperbarui." })
    } catch (err) {
      setResult({ ok: false, message: `Gagal mengunggah foto profil. ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await api.removePhoto()
      await refreshUser()
      setResult({ ok: true, message: "Foto profil dihapus. Avatar default digunakan." })
    } catch (err) {
      setResult({ ok: false, message: `Gagal menghapus foto profil. ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel className="flex flex-col items-center p-6 text-center">
      <ProfileAvatar user={user} src={preview ?? undefined} size={128} />
      <p className="mt-4 text-lg font-semibold text-ink">{displayNameOf(user)}</p>
      <p className="text-sm text-ink-faint">@{usernameOf(user)} · {user?.role ?? "Unknown"}</p>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} tabIndex={-1} />
      {preview ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" icon={Save} onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save photo"}
          </Button>
          <Button icon={X} onClick={() => setPreview(null)} disabled={busy}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button icon={Camera} onClick={() => inputRef.current?.click()} disabled={busy}>
            {user?.has_photo ? "Change photo" : "Upload photo"}
          </Button>
          {user?.has_photo && (
            <Button variant="danger" icon={Trash2} onClick={remove} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-faint">JPG, PNG, WebP · maks 5 MB</p>
      <Feedback result={result} />
      {user?.last_login && <p className="mt-4 text-xs text-ink-faint">Last login: {formatDateTime(new Date(user.last_login))} WITA</p>}
    </Panel>
  )
}

// ---------------------------------------------------------------- profile
function ProfileForm({ user }) {
  const { refreshUser } = useAuth()
  const [form, setForm] = useState(() => ({ display_name: user?.display_name ?? "", username: user?.username ?? "", email: user?.email ?? "" }))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(form.username.trim())) {
      return setResult({ ok: false, message: "Username 3–32 karakter: huruf, angka, titik, garis bawah, atau tanda hubung." })
    }
    setBusy(true)
    setResult(null)
    try {
      await api.updateProfile({ display_name: form.display_name.trim(), username: form.username.trim(), email: form.email.trim() })
      await refreshUser()
      setResult({ ok: true, message: "Profil berhasil diperbarui." })
    } catch (err) {
      setResult({ ok: false, message: `Gagal memperbarui profil. ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle>Profile information</PanelTitle>
      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Display name
          <input className={`${fieldClass} mt-1.5`} value={form.display_name} onChange={set("display_name")} maxLength={100} placeholder="Unknown" />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Username
          <input
            className={`${fieldClass} mt-1.5`}
            value={form.username}
            onChange={set("username")}
            maxLength={32}
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm font-semibold text-ink md:col-span-2">
          Email <span className="font-normal text-ink-faint">(optional)</span>
          <input className={`${fieldClass} mt-1.5`} type="email" value={form.email} onChange={set("email")} maxLength={255} autoComplete="email" />
        </label>
        <div className="md:col-span-2">
          <Button type="submit" variant="primary" icon={Save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
          <Feedback result={result} />
        </div>
      </form>
    </Panel>
  )
}

// ---------------------------------------------------------------- password
function PasswordField({ label, value, onChange, autoComplete, show, onToggle }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <span className="relative mt-1.5 block">
        <input className={`${fieldClass} pr-12`} type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} maxLength={128} />
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-1/2 right-1 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:text-accent"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  )
}

function PasswordForm() {
  const { config } = useMonitoring()
  const min = config?.min_password_length ?? 8
  const empty = { current_password: "", new_password: "", confirm_password: "" }
  const [form, setForm] = useState(empty)
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const { current_password, new_password, confirm_password } = form
    let problem = null
    if (!current_password || !new_password || !confirm_password) problem = "Semua kolom password wajib diisi."
    else if (new_password.length < min) problem = `Password baru minimal ${min} karakter.`
    else if (new_password !== confirm_password) problem = "Konfirmasi password baru tidak sama."
    else if (new_password === current_password) problem = "Password baru harus berbeda dari password saat ini."
    if (problem) return setResult({ ok: false, message: problem })

    setBusy(true)
    setResult(null)
    try {
      await api.changePassword(form)
      setForm(empty)
      setShow(false)
      setResult({ ok: true, message: "Password berhasil diubah. Gunakan password baru untuk login berikutnya. Sesi lain telah dikeluarkan." })
    } catch (err) {
      setResult({ ok: false, message: `Gagal mengubah password. ${err.message}` })
    } finally {
      setBusy(false)
    }
  }

  const toggle = () => setShow((s) => !s)
  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle hint={`Minimal ${min} karakter`}>
        <span className="inline-flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" aria-hidden="true" /> Change password
        </span>
      </PanelTitle>
      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <PasswordField label="Current password" value={form.current_password} onChange={set("current_password")} autoComplete="current-password" show={show} onToggle={toggle} />
        <PasswordField label="New password" value={form.new_password} onChange={set("new_password")} autoComplete="new-password" show={show} onToggle={toggle} />
        <PasswordField label="Confirm new password" value={form.confirm_password} onChange={set("confirm_password")} autoComplete="new-password" show={show} onToggle={toggle} />
        <div className="md:col-span-3">
          <Button type="submit" variant="primary" icon={KeyRound} disabled={busy}>
            {busy ? "Changing…" : "Change password"}
          </Button>
          <Feedback result={result} />
        </div>
      </form>
    </Panel>
  )
}

// ---------------------------------------------------------------- activity
const ACTION_LABEL = {
  LOGIN: "Login",
  LOGIN_FAILED: "Failed login attempt",
  LOGOUT: "Logout",
  PROFILE_UPDATE: "Profile updated",
  PHOTO_UPLOAD: "Profile photo uploaded",
  PHOTO_REMOVE: "Profile photo removed",
  PASSWORD_CHANGE: "Password changed",
}

function ActivityCard() {
  const { user } = useAuth()
  const [state, setState] = useState({ status: "loading", rows: [] })
  const version = user?.photo_version

  useEffect(() => {
    let cancelled = false
    api
      .fetchAudit(10)
      .then((d) => !cancelled && setState({ status: "ok", rows: d.rows }))
      .catch(() => !cancelled && setState({ status: "error", rows: [] }))
    return () => {
      cancelled = true
    }
  }, [version])

  return (
    <Panel className="p-5 sm:p-6">
      <PanelTitle>Recent activity</PanelTitle>
      {state.status === "loading" ? (
        <p className="mt-3 text-sm text-ink-faint">Loading…</p>
      ) : state.status === "error" ? (
        <p className="mt-3 text-sm text-ink-soft">Activity log unavailable.</p>
      ) : !state.rows.length ? (
        <p className="mt-3 text-sm text-ink-soft">No activity recorded yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {state.rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-ink">
                {ACTION_LABEL[r.action] ?? r.action}
                {r.detail && <span className="ml-2 text-xs text-ink-faint">{r.detail}</span>}
              </span>
              <span className="font-mono text-xs text-ink-faint">{formatDateTime(new Date(r.created_at))}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
