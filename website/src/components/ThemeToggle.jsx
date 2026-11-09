import { Moon, Sun } from "lucide-react"
import { useTheme } from "../context/ThemeContext.jsx"

// Dark / light switch for the header (same look as the other header icon buttons).
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const toLight = theme === "dark"
  const label = toLight ? "Switch to light mode" : "Switch to dark mode"
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-accent-soft hover:text-accent"
      aria-label={label}
      title={label}
    >
      {toLight ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
  )
}
