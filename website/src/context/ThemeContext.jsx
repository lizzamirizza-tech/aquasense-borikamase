import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { CHART_PALETTE } from "../constants/parameters.js"

// Dark (the original AquaSense look, default) or light. The choice is a
// per-browser display preference stored in localStorage; index.html applies
// it before the first paint so switching or reloading never flashes.
const KEY = "aquasense.theme"
const ThemeContext = createContext(null)

function readTheme() {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark"
  } catch {
    return "dark"
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === "light") root.dataset.theme = "light"
    else delete root.dataset.theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // storage unavailable (private mode) — the choice lasts for this visit
    }
  }, [theme])

  const setTheme = useCallback((t) => setThemeState(t === "light" ? "light" : "dark"), [])
  const toggleTheme = useCallback(() => setThemeState((t) => (t === "light" ? "dark" : "light")), [])
  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}

// Chart colors for the active theme (SVG attributes can't read CSS vars).
// eslint-disable-next-line react-refresh/only-export-components
export function useChartPalette() {
  return CHART_PALETTE[useTheme().theme]
}
