import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { downloadBlob } from "./csv.js"

// PNG export of one Recharts chart (not a page screenshot): the chart
// element is rendered off-screen at a fixed size, its SVG is drawn on a white
// canvas together with the title, subtitle, legend and caption, and saved as
// PNG. Only drawing happens here; the data passed in is not modified.

export const PNG_WIDTH = 1920
export const PNG_HEIGHT = 1080
const MARGIN = 64
const FONT = "Arial, Helvetica, sans-serif"

// Box of the chart inside the PNG.
export const PNG_CHART_BOX = { x: MARGIN - 8, y: 232, width: PNG_WIDTH - 2 * MARGIN + 16, height: 760 }

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

// Render `element` off-screen and wait until Recharts has drawn `ready(svg)`.
async function renderSvg(element, { width, height, ready }) {
  const host = document.createElement("div")
  host.setAttribute("aria-hidden", "true")
  Object.assign(host.style, { position: "fixed", left: "-100000px", top: "0", width: `${width}px`, height: `${height}px`, pointerEvents: "none" })
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(element))
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const svg = host.querySelector("svg.recharts-surface")
      if (svg && ready(svg)) {
        await nextFrame() // let the axis labels settle as well
        const clone = svg.cloneNode(true)
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
        clone.setAttribute("width", String(width))
        clone.setAttribute("height", String(height))
        return new XMLSerializer().serializeToString(clone)
      }
      await nextFrame()
    }
    throw new Error("The chart could not be rendered for export.")
  } finally {
    root.unmount()
    host.remove()
  }
}

function loadImage(svgText) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }))
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("The chart image could not be created."))
    }
    img.src = url
  })
}

// Draw text, shrinking the font until it fits `maxWidth` (never cut off).
function fitText(ctx, text, x, y, { size, weight = "normal", color, maxWidth }) {
  let s = size
  ctx.font = `${weight} ${s}px ${FONT}`
  while (s > 12 && ctx.measureText(text).width > maxWidth) {
    s -= 1
    ctx.font = `${weight} ${s}px ${FONT}`
  }
  ctx.fillStyle = color
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillText(text, x, y)
}

// legend: [{ label, color, shape: "line" | "box", lineWidth }]
function drawLegend(ctx, items, y) {
  ctx.font = `600 26px ${FONT}`
  const swatch = 48
  const gap = 14
  const spacing = 44
  const widths = items.map((it) => swatch + gap + ctx.measureText(it.label).width)
  let x = PNG_WIDTH - MARGIN - widths.reduce((a, b) => a + b, 0) - spacing * (items.length - 1)
  items.forEach((it, i) => {
    ctx.fillStyle = it.color
    ctx.strokeStyle = it.color
    if (it.shape === "box") {
      ctx.fillRect(x + 8, y - 22, swatch - 16, 22)
    } else {
      ctx.lineWidth = it.lineWidth ?? 4
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(x, y - 9)
      ctx.lineTo(x + swatch, y - 9)
      ctx.stroke()
    }
    ctx.fillStyle = "#1f2933"
    ctx.textAlign = "left"
    ctx.fillText(it.label, x + swatch + gap, y)
    x += widths[i] + spacing
  })
}

// element: chart sized PNG_CHART_BOX.width × PNG_CHART_BOX.height
export async function exportChartPng({ element, ready, title, subtitle, legend, caption, filename }) {
  const { x, y, width, height } = PNG_CHART_BOX
  const svgText = await renderSvg(element, { width, height, ready })
  const img = await loadImage(svgText)

  const canvas = document.createElement("canvas")
  canvas.width = PNG_WIDTH
  canvas.height = PNG_HEIGHT
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, PNG_WIDTH, PNG_HEIGHT)

  fitText(ctx, title, MARGIN, 104, { size: 46, weight: "bold", color: "#14181d", maxWidth: PNG_WIDTH - 2 * MARGIN })
  fitText(ctx, subtitle, MARGIN, 152, { size: 28, color: "#4b5563", maxWidth: PNG_WIDTH - 2 * MARGIN })
  drawLegend(ctx, legend, 206)
  ctx.drawImage(img, x, y, width, height)
  fitText(ctx, caption, MARGIN, PNG_HEIGHT - 36, { size: 22, color: "#69717b", maxWidth: PNG_WIDTH - 2 * MARGIN })

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The PNG could not be created."))), "image/png"),
  )
  downloadBlob(filename, blob)
}
