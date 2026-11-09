// Per-browser display preferences (convenience only — never monitoring data).
const KEY = "aquasense.prefs"
const DEFAULTS = { chartPeriod: "1h" }

export function readPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writePrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}
