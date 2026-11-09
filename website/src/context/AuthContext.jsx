import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import * as api from "../services/api.js"

// Who is looking at the dashboard: PUBLIC (anonymous) or the AUTHENTICATED
// ADMIN. The session itself is an HttpOnly cookie set by Node-RED — React
// never sees the token or the password hash, and every admin API call is
// verified by the backend. This state only decides what to render.
//
// status: "checking" | "authenticated" | "anonymous" | "unverified"
//   unverified = the backend could not be reached to check the session.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [status, setStatus] = useState("checking")
  const [user, setUser] = useState(null)
  const [notice, setNotice] = useState(null) // e.g. session expired
  const [verifyError, setVerifyError] = useState(null)

  const applyMe = useCallback((data) => {
    setVerifyError(null)
    if (!data.user) {
      setUser(null)
      setStatus("anonymous")
      if (data.expired) setNotice("Session telah berakhir. Silakan login kembali.")
      return null
    }
    setUser(data.user)
    setStatus("authenticated")
    return data.user
  }, [])

  const applyMeError = useCallback((err) => {
    if (err.status === 401 || err.status === 403) {
      setUser(null)
      setStatus("anonymous")
      if (err.code === "SESSION_EXPIRED") setNotice("Session telah berakhir. Silakan login kembali.")
    } else {
      setStatus((prev) => (prev === "authenticated" ? prev : "unverified"))
      setVerifyError(err.message)
    }
    return null
  }, [])

  const refreshUser = useCallback(() => api.fetchSession().then(applyMe, applyMeError), [applyMe, applyMeError])

  // restore the session after a page refresh
  useEffect(() => {
    api.fetchSession().then(applyMe, applyMeError)
  }, [applyMe, applyMeError])

  // any admin API answering 401 → the session ended server-side
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      setUser(null)
      setStatus("anonymous")
      setNotice("Session telah berakhir. Silakan login kembali.")
    })
    return () => api.setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password)
    setUser(data.user)
    setStatus("authenticated")
    setNotice(null)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // the session is dropped locally even if the server could not be reached
    }
    setUser(null)
    setStatus("anonymous")
  }, [])

  const value = useMemo(
    () => ({
      status,
      user,
      isAdmin: status === "authenticated" && user?.role === "admin",
      notice,
      verifyError,
      clearNotice: () => setNotice(null),
      login,
      logout,
      refreshUser,
    }),
    [status, user, notice, verifyError, login, logout, refreshUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
