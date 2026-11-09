import { lazy } from "react"
import { Navigate, Route, Routes, Link } from "react-router-dom"
import PublicLayout from "./layouts/PublicLayout.jsx"
import AdminLayout from "./layouts/AdminLayout.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import PublicMonitoring from "./pages/public/PublicMonitoring.jsx"
import PublicHistory from "./pages/public/PublicHistory.jsx"
import Login from "./pages/Login.jsx"

// Admin pages are loaded on demand so public visitors download less.
const Dashboard = lazy(() => import("./pages/admin/Dashboard.jsx"))
const RealtimeMonitoring = lazy(() => import("./pages/admin/RealtimeMonitoring.jsx"))
const DataReading = lazy(() => import("./pages/admin/DataReading.jsx"))
const AdminHistory = lazy(() => import("./pages/admin/AdminHistory.jsx"))
const KalmanPage = lazy(() => import("./pages/admin/KalmanPage.jsx"))
const Integration = lazy(() => import("./pages/admin/Integration.jsx"))
const Telegram = lazy(() => import("./pages/admin/Telegram.jsx"))
const Settings = lazy(() => import("./pages/admin/Settings.jsx"))
const Profile = lazy(() => import("./pages/admin/Profile.jsx"))

// PUBLIC: /, /history (no login) · LOGIN: /login · ADMIN: /admin/* (protected)
export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<PublicMonitoring />} />
        <Route path="history" element={<PublicHistory />} />
      </Route>
      <Route path="login" element={<Login />} />
      <Route path="admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="monitoring" element={<RealtimeMonitoring />} />
          <Route path="data-reading" element={<DataReading />} />
          <Route path="history" element={<AdminHistory />} />
          <Route path="kalman" element={<KalmanPage />} />
          <Route path="integration" element={<Integration />} />
          <Route path="telegram" element={<Telegram />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl font-bold text-ink">404</p>
      <p className="mt-2 text-sm text-ink-soft">Halaman tidak ditemukan.</p>
      <Link to="/" className="mt-4 text-sm font-semibold text-accent hover:underline">
        Kembali ke monitoring
      </Link>
    </div>
  )
}
