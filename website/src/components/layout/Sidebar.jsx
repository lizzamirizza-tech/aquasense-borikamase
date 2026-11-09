import { NavLink } from "react-router-dom"
import { ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react"
import { LogoMark } from "../Logo.jsx"
import { ADMIN_NAV } from "../../constants/navigation.js"

// Admin sidebar. Collapsed items keep a native tooltip (title) — a custom
// tooltip would be clipped by the scrolling nav.
//  - desktop: expanded (w-64) or collapsed to icons (w-[72px]) with tooltips
//  - below lg: slide-out drawer, closed after navigation
export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, onLogout }) {
  const narrow = collapsed // only applies ≥ lg; the drawer is always expanded
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-surface transition-[transform,width] duration-200 ease-out lg:z-30 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${narrow ? "lg:w-[72px]" : "lg:w-64"}`}
        aria-label="Admin navigation"
      >
        <div className={`flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 ${narrow ? "lg:justify-center lg:px-0" : ""}`}>
          <LogoMark size={34} className="shrink-0" />
          <div className={`min-w-0 leading-tight ${narrow ? "lg:hidden" : ""}`}>
            <p className="text-[15px] font-bold tracking-tight text-ink">
              Aqua<span className="text-accent">Sense</span>
            </p>
            <p className="truncate text-[11px] text-ink-faint">Water Quality Monitoring</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-accent-soft lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {ADMIN_NAV.map((section) => (
            <div key={section.group} className="mb-4">
              <p className={`px-3 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-ink-faint uppercase ${narrow ? "lg:sr-only" : ""}`}>
                {section.group}
              </p>
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onCloseMobile}
                  title={narrow ? label : undefined}
                  className={({ isActive }) =>
                    `group relative mb-0.5 flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                      narrow ? "lg:justify-center lg:px-0" : ""
                    } ${isActive ? "bg-accent-soft font-semibold text-accent-strong" : "text-ink-soft hover:bg-surface-alt hover:text-ink"}`
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
                  <span className={`truncate ${narrow ? "lg:sr-only" : ""}`}>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={onLogout}
            title={narrow ? "Logout" : undefined}
            className={`group relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-danger hover:bg-danger-bg ${narrow ? "lg:justify-center lg:px-0" : ""}`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
            <span className={narrow ? "lg:sr-only" : ""}>Logout</span>
          </button>
        </nav>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden h-12 shrink-0 items-center justify-center gap-2 border-t border-line text-xs font-medium text-ink-faint hover:text-accent lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
      </aside>
    </>
  )
}
