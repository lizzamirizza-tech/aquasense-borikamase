// Water-quality categories.
//
// The category (GOOD / WARNING / DANGER) is decided ONLY by the Node-RED
// "Quality Check" node and arrives as `water_quality`. The dashboard displays
// it as-is and never re-classifies readings. Threshold texts shown in the UI
// come from GET /api/config (maintained next to the Node-RED rules).

export const QUALITY = {
  GOOD: "GOOD",
  WARNING: "WARNING",
  DANGER: "DANGER",
}

export const QUALITY_TONE = {
  GOOD: "good",
  WARNING: "warning",
  DANGER: "danger",
}

// Icons accompany every status color so meaning never relies on color alone.
export const QUALITY_ICON = { GOOD: "✓", WARNING: "⚠", DANGER: "🚨" }

export const QUALITY_TEXT = {
  GOOD: "Kondisi air berada pada kategori baik berdasarkan parameter pH, TDS, dan turbidity yang dipantau.",
  WARNING:
    "Terdapat parameter pada kategori peringatan. Pemeriksaan atau pengolahan lebih lanjut disarankan.",
  DANGER:
    "Terdapat parameter pada kategori bahaya. Diperlukan pemeriksaan dan pengolahan lebih lanjut sebelum air digunakan.",
}

export const CLASSIFICATION_NOTE =
  "Water condition is categorized based on the monitored pH, TDS, and turbidity parameters. Not a microbiological test."

export const SCOPE_DISCLAIMER =
  "Kategori hanya berdasarkan pH, TDS dan turbidity. Sistem tidak melakukan uji mikrobiologi dan tidak menyatakan air layak minum."
