import SensorCard from "./SensorCard.jsx"
import { PARAMETERS } from "../constants/parameters.js"
import { useLiveState } from "../hooks/useAquaSense.js"

// pH / TDS / Turbidity cards: 1 column on phones, 2 on tablets, 3 on desktop.
export default function SensorGrid() {
  const { live } = useLiveState(5000)
  const fresh = live.state === "live"
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {PARAMETERS.map((p) => (
        <SensorCard key={p.key} parameter={p} fresh={fresh} />
      ))}
    </div>
  )
}
