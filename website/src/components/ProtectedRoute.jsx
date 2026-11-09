import { Navigate, Outlet, useLocation } from "react-router-dom"
import { LoaderCircle, RefreshCw, ShieldAlert } from "lucide-react"
import { useAuth } from "../context/AuthContext.jsx"
import { Button } from "./Section.jsx"

// Guards /admin/*. This is UX only — every admin API call is independently
// verified by Node-RED, so bypassing it in the browser exposes nothing.
export default function ProtectedRoute() {
  const { status, isAdmin, verifyError, refreshUser } = useAuth()
  const location = useLocation()

  if (status === "checking") {
    return (
      <FullScreen>
        <LoaderCircle className="h-7 w-7 animate-spin text-accent" aria-hidden="true" />
        <p className="mt-3 text-sm text-ink-soft">Memeriksa sesi…</p>
      </FullScreen>
    )
  }
  if (status === "unverified") {
    return (
      <FullScreen>
        <ShieldAlert className="h-8 w-8 text-warning" aria-hidden="true" />
        <p className="mt-3 text-base font-semibold text-ink">Sesi tidak dapat diverifikasi</p>
        <p className="mt-1 max-w-sm text-center text-sm text-ink-soft">{verifyError}</p>
        <Button icon={RefreshCw} className="mt-4" onClick={refreshUser}>
          Coba lagi
        </Button>
      </FullScreen>
    )
  }
  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

function FullScreen({ children }) {
  return <div className="flex min-h-screen flex-col items-center justify-center px-6">{children}</div>
}
