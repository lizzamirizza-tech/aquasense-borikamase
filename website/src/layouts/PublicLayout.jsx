import { useEffect } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import TopHeader from "../components/layout/TopHeader.jsx"
import Footer from "../components/layout/Footer.jsx"
import { PUBLIC_NAV } from "../constants/navigation.js"

// Community view: no login, no admin navigation.
export default function PublicLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const link = ({ isActive }) =>
    `inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
      isActive ? "bg-accent-soft text-accent-strong" : "text-ink-soft hover:bg-surface-alt hover:text-ink"
    }`

  return (
    <div className="flex min-h-screen flex-col">
      <TopHeader showBrand>
        <nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Public navigation">
          {PUBLIC_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </TopHeader>
      {/* mobile tab bar */}
      <nav className="sticky top-16 z-20 flex gap-1 border-b border-line bg-surface px-3 py-1.5 lg:hidden" aria-label="Public navigation">
        {PUBLIC_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={(s) => `${link(s)} flex-1 justify-center`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
