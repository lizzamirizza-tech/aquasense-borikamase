import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, Info } from "lucide-react"
import LoginForm from "../components/LoginForm.jsx"
import { LogoMark } from "../components/Logo.jsx"
import { Alert } from "../components/Section.jsx"
import { useAuth } from "../context/AuthContext.jsx"

export default function Login() {
  const { isAdmin, login, notice, clearNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = typeof location.state?.from === "string" && location.state.from.startsWith("/admin") ? location.state.from : "/admin/dashboard"

  if (isAdmin) return <Navigate to={from} replace />

  async function handleLogin(username, password) {
    await login(username, password)
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={56} />
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink">
            Aqua<span className="text-accent">Sense</span>
          </p>
          <p className="text-sm text-ink-soft">Water Quality Monitoring System</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <h1 className="mb-4 text-lg font-semibold text-ink">Admin Login</h1>
          {location.state?.loggedOut && !notice && (
            <Alert tone="good" className="mb-4">
              Anda telah logout.
            </Alert>
          )}
          {notice && (
            <Alert tone="info" icon={Info} className="mb-4" action={<button type="button" onClick={clearNotice} className="text-xs underline">OK</button>}>
              {notice}
            </Alert>
          )}
          {location.state?.from && !notice && (
            <Alert tone="info" icon={Info} className="mb-4">
              Silakan login untuk mengakses halaman admin.
            </Alert>
          )}
          <LoginForm onSubmit={handleLogin} />
        </div>

        <Link to="/" className="mt-5 flex min-h-10 items-center justify-center gap-2 text-sm font-medium text-ink-soft hover:text-accent">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kembali ke monitoring
        </Link>
      </div>
    </div>
  )
}
