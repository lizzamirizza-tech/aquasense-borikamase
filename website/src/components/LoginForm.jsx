import { useState } from "react"
import { Eye, EyeOff, LoaderCircle, LogIn, TriangleAlert } from "lucide-react"
import { Alert } from "./Section.jsx"
import { fieldClass } from "./Filters.jsx"

// Username + password form. Credentials go only to POST /api/auth/login;
// nothing is checked or stored in the browser.
export default function LoginForm({ onSubmit }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(username.trim(), password)
    } catch (err) {
      setError(err.status === 401 ? "Username atau password salah." : err.message)
      setPassword("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <Alert tone="danger" icon={TriangleAlert}>
          {error}
        </Alert>
      )}
      <label className="block text-sm font-semibold text-ink">
        Username
        <input
          className={`${fieldClass} mt-1.5`}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={64}
          required
        />
      </label>
      <label className="block text-sm font-semibold text-ink">
        Password
        <span className="relative mt-1.5 block">
          <input
            className={`${fieldClass} pr-12`}
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={128}
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-1 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:text-accent"
            aria-label={show ? "Hide password" : "Show password"}
            title={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-on-accent hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Signing in…" : "Login"}
      </button>
    </form>
  )
}
