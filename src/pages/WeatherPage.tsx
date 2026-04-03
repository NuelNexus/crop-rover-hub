import AppLayout from "@/components/layout/AppLayout";
import { CloudSun, Droplets, Wind, Thermometer, Sun, Cloud, CloudRain, Snowflake, Eye, Gauge } from "lucide-react";

const hourlyForecast = [
  { time: "6 AM", temp: 18, icon: Sun, desc: "Sunny" },
  { time: "9 AM", temp: 22, icon: CloudSun, desc: "Partly Cloudy" },
  { time: "12 PM", temp: 29, icon: Sun, desc: "Sunny" },
  { time: "3 PM", temp: 32, icon: CloudSun, desc: "Partly Cloudy" },
  { time: "6 PM", temp: 27, icon: Cloud, desc: "Cloudy" },
  { time: "9 PM", temp: 21, icon: Cloud, desc: "Overcast" },
];

const weeklyForecast = [
  { day: "Monday", high: 32, low: 18, icon: Sun, desc: "Sunny", precip: "0%" },
  { day: "Tuesday", high: 29, low: 17, icon: CloudSun, desc: "Partly Cloudy", precip: "10%" },
  { day: "Wednesday", high: 25, low: 16, icon: CloudRain, desc: "Light Rain", precip: "60%" },
  { day: "Thursday", high: 28, low: 15, icon: CloudSun, desc: "Partly Cloudy", precip: "15%" },
  { day: "Friday", high: 31, low: 19, icon: Sun, desc: "Sunny", precip: "5%" },
  { day: "Saturday", high: 33, low: 20, icon: Sun, desc: "Hot & Sunny", precip: "0%" },
  { day: "Sunday", high: 30, low: 18, icon: Cloud, desc: "Cloudy", precip: "20%" },
];

const farmingAdvice = [
  { condition: "Optimal Spraying", detail: "Wind speed under 15 km/h. Good conditions for pesticide application today.", ok: true },
  { condition: "Irrigation Advisory", detail: "No rain expected for 3 days. Schedule irrigation for moisture-sensitive crops.", ok: false },
  { condition: "Frost Alert", detail: "No frost risk in the next 7 days. Minimum temp stays above 15°C.", ok: true },
  { condition: "Harvest Weather", detail: "Dry conditions expected Thursday–Saturday. Ideal window for grain harvesting.", ok: true },
];

const WeatherPage = () => (
  <AppLayout>
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold flex items-center gap-2"><CloudSun className="w-6 h-6" /> Weather</h1>

      {/* Current Conditions */}
      <div className="stat-card bg-gradient-to-br from-primary/5 to-chart-blue/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Conditions · Farm Location</p>
            <p className="font-display text-5xl font-bold mt-2">29°C</p>
            <p className="text-sm text-muted-foreground mt-1">Feels like 32°C · Partly Cloudy</p>
          </div>
          <CloudSun className="w-16 h-16 text-warning" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-chart-blue" /><div><p className="text-xs text-muted-foreground">Humidity</p><p className="font-semibold">65%</p></div></div>
          <div className="flex items-center gap-2"><Wind className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Wind</p><p className="font-semibold">12 km/h NW</p></div></div>
          <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Visibility</p><p className="font-semibold">10 km</p></div></div>
          <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Pressure</p><p className="font-semibold">1013 hPa</p></div></div>
        </div>
      </div>

      {/* Hourly */}
      <div className="stat-card">
        <h2 className="font-display text-lg font-semibold mb-4">Hourly Forecast</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {hourlyForecast.map(h => (
            <div key={h.time} className="flex flex-col items-center gap-2 min-w-[70px] p-3 rounded-xl bg-secondary/50">
              <span className="text-xs text-muted-foreground">{h.time}</span>
              <h.icon className="w-6 h-6 text-warning" />
              <span className="font-display font-bold">{h.temp}°</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly */}
        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">7-Day Forecast</h2>
          <div className="space-y-3">
            {weeklyForecast.map(d => (
              <div key={d.day} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm font-medium w-24">{d.day}</span>
                <d.icon className="w-5 h-5 text-warning" />
                <span className="text-xs text-muted-foreground w-24">{d.desc}</span>
                <span className="text-xs text-chart-blue flex items-center gap-1"><Droplets className="w-3 h-3" />{d.precip}</span>
                <span className="text-sm font-display"><span className="font-bold">{d.high}°</span> / <span className="text-muted-foreground">{d.low}°</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Farming Advice */}
        <div className="stat-card">
          <h2 className="font-display text-lg font-semibold mb-4">🌾 Farming Weather Advisory</h2>
          <div className="space-y-3">
            {farmingAdvice.map(a => (
              <div key={a.condition} className={`p-3 rounded-xl border-l-4 ${a.ok ? "border-l-primary bg-primary/5" : "border-l-warning bg-warning/5"}`}>
                <p className="font-medium text-sm">{a.condition}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
);

export default WeatherPage;
