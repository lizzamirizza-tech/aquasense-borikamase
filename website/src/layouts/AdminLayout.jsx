import { Suspense, useEffect, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Sidebar from "../components/layout/Sidebar.jsx"
import TopHeader from "../components/layout/TopHeader.jsx"
import Footer from "../components/layout/Footer.jsx"
import { LoadingBlock } from "../components/EmptyState.jsx"
import { useAuth } from "../context/AuthContext.jsx"

const COLLAPSE_KEY = "aquasense.sidebar.collapsed"

function readCollapsed() {
  try {
    const stored = localStorage.getItem(COLLAPSE_KEY)
    if (stored !== null) return stored === "1"
  } catch {
    // storage unavailable
  }
  // laptops/tablets in landscape start collapsed, large desktops expanded
  return typeof window !== "undefined" && window.innerWidth < 1280
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // new page → top (the drawer closes itself through NavLink onClick)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1")
      } catch {
        // ignore
      }
      return !c
    })
  }

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true, state: { loggedOut: true } })
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />
      <div className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ${collapsed ? "lg:pl-[72px]" : "lg:pl-64"}`}>
        <TopHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<LoadingBlock label="Loading page…" />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  )
}
