import { Link } from "react-router-dom"
import { LogIn, Menu } from "lucide-react"
import LiveIndicator from "../LiveIndicator.jsx"
import NotificationPanel from "../NotificationPanel.jsx"
import ProfileDropdown from "../ProfileDropdown.jsx"
import ThemeToggle from "../ThemeToggle.jsx"
import { LogoMark } from "../Logo.jsx"
import { useAuth } from "../../context/AuthContext.jsx"

// Global header: brand + location, LIVE / WAITING / OFFLINE with last update,
// then notifications + profile (admin) or the Admin Login button (public).
export default function TopHeader({ onMenuClick, showBrand = false, children }) {
  const { isAdmin } = useAuth()
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-4 sm:px-6">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-accent-soft hover:text-accent lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className={`flex min-w-0 items-center gap-2.5 ${showBrand ? "" : "lg:hidden"}`}>
          <LogoMark size={30} className="shrink-0 max-sm:hidden" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-bold tracking-tight text-ink">
              Aqua<span className="text-accent">Sense</span>
            </p>
            <p className="truncate text-[11px] text-ink-faint max-sm:hidden">Desa Borikamase, Maros Baru</p>
          </div>
        </div>
        {!showBrand && (
          <p className="hidden min-w-0 truncate text-sm text-ink-soft lg:block">
            <span className="font-semibold text-ink">Desa Borikamase</span>, Maros Baru
          </p>
        )}

        {children}

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
          <div className="hidden sm:block">
            <LiveIndicator />
          </div>
          <div className="sm:hidden">
            <LiveIndicator compact />
          </div>
          <ThemeToggle />
          {isAdmin ? (
            <>
              <NotificationPanel isAdmin />
              <ProfileDropdown />
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-accent bg-accent px-3 text-sm font-semibold text-on-accent hover:bg-accent-strong"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className="max-sm:sr-only">Admin Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
