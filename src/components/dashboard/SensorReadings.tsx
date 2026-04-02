import { Thermometer, Droplets, Wind, Sun, Gauge } from "lucide-react";

const sensors = [
  { label: "Soil Moisture", value: "42%", icon: Droplets, color: "text-chart-blue" },
  { label: "Temperature", value: "29°C", icon: Thermometer, color: "text-chart-orange" },
  { label: "Humidity", value: "76%", icon: Wind, color: "text-chart-green" },
  { label: "Light Intensity", value: "850 lux", icon: Sun, color: "text-chart-yellow" },
  { label: "Soil pH", value: "6.5", icon: Gauge, color: "text-primary" },
  { label: "Wind Speed", value: "12 km/h", icon: Wind, color: "text-muted-foreground" },
];

const SensorReadings = () => (
  <div>
    <h2 className="font-display text-lg font-semibold mb-3">Live Sensor Readings</h2>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {sensors.map((s) => (
        <div key={s.label} className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <s.icon className={`w-5 h-5 ${s.color}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-display text-lg font-bold">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default SensorReadings;
