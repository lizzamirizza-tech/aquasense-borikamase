import {
  LayoutDashboard,
  Activity,
  ClipboardList,
  History,
  Sigma,
  Network,
  Send,
  Settings,
  UserRound,
  Waves,
} from "lucide-react"

// Admin sidebar groups.
export const ADMIN_NAV = [
  {
    group: "Main",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/monitoring", label: "Real-Time Monitoring", icon: Activity },
      { to: "/admin/data-reading", label: "Data Reading", icon: ClipboardList },
      { to: "/admin/history", label: "Monitoring History", icon: History },
    ],
  },
  {
    group: "Analysis",
    items: [
      { to: "/admin/kalman", label: "Kalman Filter Analysis", icon: Sigma },
      { to: "/admin/integration", label: "System Integration", icon: Network },
    ],
  },
  {
    group: "Notification",
    items: [{ to: "/admin/telegram", label: "Telegram Notification", icon: Send }],
  },
  {
    group: "System",
    items: [
      { to: "/admin/settings", label: "Settings", icon: Settings },
      { to: "/admin/profile", label: "Profile", icon: UserRound },
    ],
  },
]

// Public (community) navigation — no login required.
export const PUBLIC_NAV = [
  { to: "/", label: "Monitoring", icon: Waves, end: true },
  { to: "/history", label: "History", icon: History },
]
