import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export type WeatherLocation = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

type OpenMeteoResponse = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
};

const STORAGE_KEY = "harvest-iq-weather-location";

export const weatherCodeLabel = (code?: number) => {
  if (code == null) return "Unknown";
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Cloudy";
};

export const windDirection = (degrees?: number) => {
  if (degrees == null) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
};

const defaultLocation: WeatherLocation = {
  name: "Farm Location",
  latitude: 9.082,
  longitude: 8.6753,
  country: "Nigeria",
};

const loadStoredLocation = (): WeatherLocation | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveWeatherLocation = (location: WeatherLocation) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
};

export const searchWeatherLocations = async (query: string): Promise<WeatherLocation[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=en&format=json`,
  );
  if (!res.ok) throw new Error("Location search failed");
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
  }));
};

export const useWeatherLocation = () => {
  const [location, setLocation] = useState<WeatherLocation>(() => loadStoredLocation() || defaultLocation);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  const updateLocation = (next: WeatherLocation) => {
    saveWeatherLocation(next);
    setLocation(next);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation({
          name: "Current Farm Location",
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
        });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15 * 60 * 1000 },
    );
  };

  useEffect(() => {
    if (loadStoredLocation()) return;
    useCurrentLocation();
  }, []);

  return { location, updateLocation, useCurrentLocation, geoStatus };
};

export const useWeather = (location: WeatherLocation) => {
  return useQuery({
    queryKey: ["weather", location.latitude, location.longitude],
    queryFn: async () => {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m",
        hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
        timezone: "auto",
        forecast_days: "7",
      });
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      if (!res.ok) throw new Error("Weather API request failed");
      return (await res.json()) as OpenMeteoResponse;
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
};

export const useWeatherSummary = () => {
  const locationState = useWeatherLocation();
  const weather = useWeather(locationState.location);

  const summary = useMemo(() => {
    const data = weather.data;
    if (!data) return null;
    return {
      current: data.current,
      hourly: data.hourly.time.slice(0, 12).map((time, i) => ({
        time,
        temp: data.hourly.temperature_2m[i],
        precip: data.hourly.precipitation_probability[i],
        code: data.hourly.weather_code[i],
        wind: data.hourly.wind_speed_10m[i],
      })),
      daily: data.daily.time.map((time, i) => ({
        time,
        high: data.daily.temperature_2m_max[i],
        low: data.daily.temperature_2m_min[i],
        precip: data.daily.precipitation_probability_max[i],
        code: data.daily.weather_code[i],
        wind: data.daily.wind_speed_10m_max[i],
      })),
    };
  }, [weather.data]);

  return { ...locationState, ...weather, summary };
};
