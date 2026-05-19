import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Eye,
  Gauge,
  MapPin,
  LocateFixed,
  Search,
  Loader2,
} from "lucide-react";
import {
  searchWeatherLocations,
  useWeatherSummary,
  weatherCodeLabel,
  windDirection,
  WeatherLocation,
} from "@/hooks/useWeather";
import { toast } from "sonner";

const WeatherIcon = ({ code, className = "w-6 h-6 text-warning" }: { code?: number; className?: string }) => {
  if (code === 0) return <Sun className={className} />;
  if ([61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code || -1)) return <CloudRain className={className} />;
  if ([71, 73, 75, 77, 85, 86].includes(code || -1)) return <Snowflake className={className} />;
  if ([1, 2].includes(code || -1)) return <CloudSun className={className} />;
  return <Cloud className={className} />;
};

const formatDay = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });

const formatHour = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", { hour: "numeric" });

const WeatherPage = () => {
  const { location, updateLocation, useCurrentLocation, geoStatus, summary, isLoading, error, refetch } = useWeatherSummary();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);

  const current = summary?.current;
  const daily = summary?.daily || [];
  const hourly = summary?.hourly || [];
  const today = daily[0];

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const matches = await searchWeatherLocations(query);
      setResults(matches);
      if (matches.length === 0) toast.error("No locations found");
    } catch (e: any) {
      toast.error(e.message || "Could not search locations");
    } finally {
      setSearching(false);
    }
  };

  const farmingAdvice = current && today ? [
    {
      condition: "Spraying Window",
      detail: current.wind_speed_10m <= 15 && current.precipitation === 0
        ? `Wind is ${Math.round(current.wind_speed_10m)} km/h with no current rain, so spraying conditions are reasonable.`
        : `Avoid spraying now: wind is ${Math.round(current.wind_speed_10m)} km/h and rain is ${current.precipitation} mm.`,
      ok: current.wind_speed_10m <= 15 && current.precipitation === 0,
    },
    {
      condition: "Irrigation Advisory",
      detail: today.precip < 35
        ? `Rain probability is ${today.precip}%. Check soil moisture and irrigate sensitive crops if readings are low.`
        : `Rain probability is ${today.precip}%. Delay irrigation unless sensors show severe dryness.`,
      ok: today.precip >= 35,
    },
    {
      condition: "Heat Stress",
      detail: today.high >= 35
        ? `High of ${Math.round(today.high)}°C may stress crops and livestock. Add shade, water, and avoid midday handling.`
        : `High of ${Math.round(today.high)}°C is below severe heat-stress range.`,
      ok: today.high < 35,
    },
    {
      condition: "Harvest Weather",
      detail: today.precip <= 20
        ? `Dry forecast today with ${today.precip}% rain probability. Good harvest or field-work window.`
        : `Rain risk is ${today.precip}%. Protect harvested crops and avoid exposed storage.`,
      ok: today.precip <= 20,
    },
  ] : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl font-bold flex items-center gap-2"><CloudSun className="w-6 h-6" /> Weather</h1>
          <button
            onClick={() => refetch()}
            className="text-sm px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80"
          >
            Refresh live data
          </button>
        </div>

        <div className="stat-card space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Search farm location"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm"
              />
            </div>
            <button onClick={runSearch} disabled={searching} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
              {searching ? "Searching…" : "Search"}
            </button>
            <button onClick={useCurrentLocation} className="px-4 py-2.5 rounded-xl bg-secondary text-sm font-medium flex items-center gap-2 justify-center">
              <LocateFixed className="w-4 h-4" /> Use GPS
            </button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {location.name}{location.admin1 ? `, ${location.admin1}` : ""}{location.country ? `, ${location.country}` : ""}
            {geoStatus === "loading" && " · locating…"}
          </p>
          {results.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {results.map((r) => (
                <button
                  key={`${r.latitude}-${r.longitude}`}
                  onClick={() => { updateLocation(r); setResults([]); setQuery(""); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80"
                >
                  {r.name}{r.admin1 ? `, ${r.admin1}` : ""}{r.country ? `, ${r.country}` : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="stat-card h-64 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading live weather…
          </div>
        ) : error || !current ? (
          <div className="stat-card text-center py-12 text-muted-foreground">
            <p className="text-sm">Weather data could not load.</p>
          </div>
        ) : (
          <>
            <div className="stat-card bg-gradient-to-br from-primary/5 to-chart-blue/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Conditions · {location.name}</p>
                  <p className="font-display text-5xl font-bold mt-2">{Math.round(current.temperature_2m)}°C</p>
                  <p className="text-sm text-muted-foreground mt-1">Feels like {Math.round(current.apparent_temperature)}°C · {weatherCodeLabel(current.weather_code)}</p>
                </div>
                <WeatherIcon code={current.weather_code} className="w-16 h-16 text-warning" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-chart-blue" /><div><p className="text-xs text-muted-foreground">Humidity</p><p className="font-semibold">{current.relative_humidity_2m}%</p></div></div>
                <div className="flex items-center gap-2"><Wind className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Wind</p><p className="font-semibold">{Math.round(current.wind_speed_10m)} km/h {windDirection(current.wind_direction_10m)}</p></div></div>
                <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Rain now</p><p className="font-semibold">{current.precipitation} mm</p></div></div>
                <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Pressure</p><p className="font-semibold">{Math.round(current.pressure_msl)} hPa</p></div></div>
              </div>
            </div>

            <div className="stat-card">
              <h2 className="font-display text-lg font-semibold mb-4">Hourly Forecast</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {hourly.map((h) => (
                  <div key={h.time} className="flex flex-col items-center gap-2 min-w-[78px] p-3 rounded-xl bg-secondary/50">
                    <span className="text-xs text-muted-foreground">{formatHour(h.time)}</span>
                    <WeatherIcon code={h.code} />
                    <span className="font-display font-bold">{Math.round(h.temp)}°</span>
                    <span className="text-[10px] text-chart-blue">{h.precip}% rain</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="stat-card">
                <h2 className="font-display text-lg font-semibold mb-4">7-Day Forecast</h2>
                <div className="space-y-3">
                  {daily.map((d) => (
                    <div key={d.time} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm font-medium w-24">{formatDay(d.time)}</span>
                      <WeatherIcon code={d.code} className="w-5 h-5 text-warning" />
                      <span className="text-xs text-muted-foreground flex-1">{weatherCodeLabel(d.code)}</span>
                      <span className="text-xs text-chart-blue flex items-center gap-1"><Droplets className="w-3 h-3" />{d.precip}%</span>
                      <span className="text-sm font-display"><span className="font-bold">{Math.round(d.high)}°</span> / <span className="text-muted-foreground">{Math.round(d.low)}°</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stat-card">
                <h2 className="font-display text-lg font-semibold mb-4">🌾 Farming Weather Advisory</h2>
                <div className="space-y-3">
                  {farmingAdvice.map((a) => (
                    <div key={a.condition} className={`p-3 rounded-xl border-l-4 ${a.ok ? "border-l-primary bg-primary/5" : "border-l-warning bg-warning/5"}`}>
                      <p className="font-medium text-sm">{a.condition}</p>
                      <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default WeatherPage;
