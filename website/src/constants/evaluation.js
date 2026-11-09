// Sensor Accuracy Evaluation shown on the Kalman Analysis page: results of
// the sensor test against reference instruments. They are entered as
// reported (kept as text, so nothing is re-rounded) and are NOT recalculated
// from the monitoring data.
// Measurement unit of each parameter as shown on the Kalman Analysis page.
export const PARAMETER_UNIT = { ph: "pH", tds: "ppm", turbidity: "NTU" }

export const SENSOR_ACCURACY = [
  { key: "ph", label: "pH", unit: "pH", accuracy: "99.22%", mae: "0.046", rmse: "0.049" },
  { key: "tds", label: "TDS", unit: "ppm", accuracy: "98.77%", mae: "2.667", rmse: "3.109" },
  { key: "turbidity", label: "Turbidity", unit: "NTU", accuracy: "96.97%", mae: "0.167", rmse: "0.245" },
]
