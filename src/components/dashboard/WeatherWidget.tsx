import { Link } from "react-router-dom";
import { CloudSun, Droplets, Wind, Thermometer, Loader2 } from "lucide-react";
import { useWeatherSummary, weatherCodeLabel } from "@/hooks/useWeather";

const WeatherWidget = () => {
  const { summary, isLoading, location } = useWeatherSummary();
  const current = summary?.current;
  const daily = summary?.daily || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold">Weather forecast</h2>
        <Link to="/weather" className="text-xs text-primary font-medium">open app</Link>
      </div>

      <div className="stat-card mb-4">
        {isLoading || !current ? (
          <div className="h-28 flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading weather…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today · {location.name}</p>
                <p className="font-display text-4xl font-bold">
                  {Math.round(current.temperature_2m)}<span className="text-lg">°</span>
                  {daily[0] && <span className="text-sm text-muted-foreground font-normal">/{Math.round(daily[0].low)}°</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{weatherCodeLabel(current.weather_code)}</p>
              </div>
              <CloudSun className="w-12 h-12 text-warning" />
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {current.relative_humidity_2m}%</span>
              <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {Math.round(current.wind_speed_10m)} km/h</span>
              <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> Feels {Math.round(current.apparent_temperature)}°</span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {daily.slice(1, 5).map((f) => (
          <div key={f.time} className="stat-card text-center">
            <p className="text-xs text-muted-foreground">{new Date(`${f.time}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            <p className="font-display text-2xl font-bold mt-1">{Math.round(f.high)}°</p>
            <p className="text-xs text-muted-foreground">{weatherCodeLabel(f.code)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherWidget;
