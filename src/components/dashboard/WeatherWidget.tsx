import { CloudSun, Droplets, Wind, Thermometer } from "lucide-react";

const forecasts = [
  { date: "25 June", temp: 29, desc: "Thunderstorm" },
  { date: "26 June", temp: 32, desc: "Rainy cloudy" },
  { date: "27 June", temp: 39, desc: "Semicloudy" },
  { date: "28 June", temp: 42, desc: "Humidity" },
];

const WeatherWidget = () => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display text-lg font-semibold">Weather forecast</h2>
      <span className="text-xs text-primary font-medium cursor-pointer">open app</span>
    </div>

    <div className="stat-card mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="font-display text-4xl font-bold">
            37<span className="text-lg">°</span>
            <span className="text-sm text-muted-foreground font-normal">/23°</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">Rainy · Cloudy</p>
        </div>
        <CloudSun className="w-12 h-12 text-warning" />
      </div>
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> 65%</span>
        <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> 12 km/h</span>
        <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Feels 39°</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {forecasts.map((f) => (
        <div key={f.date} className="stat-card text-center">
          <p className="text-xs text-muted-foreground">{f.date}</p>
          <p className="font-display text-2xl font-bold mt-1">{f.temp}°</p>
          <p className="text-xs text-muted-foreground">{f.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

export default WeatherWidget;
