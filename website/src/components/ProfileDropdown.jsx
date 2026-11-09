import { useCallback, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react"
import ProfileAvatar, { displayNameOf, usernameOf } from "./ProfileAvatar.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { useDismiss } from "../hooks/useDismiss.js"

export default function ProfileDropdown() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  async function handleLogout() {
    close()
    await logout()
    navigate("/login", { replace: true, state: { loggedOut: true } })
  }

  const item = "flex min-h-11 w-full items-center gap-3 px-4 text-sm text-ink hover:bg-accent-soft hover:text-accent"
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-accent-soft"
      >
        <ProfileAvatar user={user} size={36} className="max-sm:!h-8 max-sm:!w-8" />
        <span className="hidden max-w-32 truncate text-sm font-semibold text-ink md:block">{displayNameOf(user)}</span>
        <ChevronDown className="hidden h-4 w-4 text-ink-faint md:block" aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute top-12 right-0 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-card-hover">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <ProfileAvatar user={user} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayNameOf(user)}</p>
              <p className="truncate text-xs text-ink-faint">@{usernameOf(user)}</p>
            </div>
          </div>
          <Link role="menuitem" to="/admin/profile" onClick={close} className={item}>
            <UserRound className="h-4 w-4" aria-hidden="true" /> Profile
          </Link>
          <Link role="menuitem" to="/admin/settings" onClick={close} className={item}>
            <Settings className="h-4 w-4" aria-hidden="true" /> Settings
          </Link>
          <button role="menuitem" type="button" onClick={handleLogout} className={`${item} border-t border-line text-danger hover:!text-danger`}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Logout
          </button>
        </div>
      )}
    </div>
  )
}
