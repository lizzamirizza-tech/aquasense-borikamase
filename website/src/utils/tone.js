// Tailwind class sets per semantic tone. Status colors are reserved for
// status only and always appear together with an icon and a text label.
export const TONE = {
  good: { text: "text-good", bg: "bg-good-bg", border: "border-good-border", dot: "bg-good", ring: "ring-good-border" },
  warning: { text: "text-warning", bg: "bg-warning-bg", border: "border-warning-border", dot: "bg-warning", ring: "ring-warning-border" },
  danger: { text: "text-danger", bg: "bg-danger-bg", border: "border-danger-border", dot: "bg-danger", ring: "ring-danger-border" },
  neutral: { text: "text-offline", bg: "bg-offline-bg", border: "border-offline-border", dot: "bg-offline", ring: "ring-offline-border" },
}

export const toneOf = (tone) => TONE[tone] ?? TONE.neutral
