import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeId =
  | "harvest"
  | "midnight"
  | "ocean"
  | "sunset"
  | "forest"
  | "lavender"
  | "sakura"
  | "mono"
  | "solar"
  | "cyber";

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  swatch: string[];
  dark?: boolean;
};

export const THEMES: Theme[] = [
  { id: "harvest",  name: "Harvest",  description: "Default earthy green",  swatch: ["#e8ecd7", "#1e8449", "#f39c12", "#2c3e2d"] },
  { id: "midnight", name: "Midnight", description: "Deep indigo dark",      swatch: ["#0f172a", "#1e293b", "#6366f1", "#a5b4fc"], dark: true },
  { id: "ocean",    name: "Ocean",    description: "Cool blues & teals",    swatch: ["#e0f2fe", "#0ea5e9", "#0369a1", "#082f49"] },
  { id: "sunset",   name: "Sunset",   description: "Warm coral & amber",    swatch: ["#fff7ed", "#f97316", "#c2410c", "#7c2d12"] },
  { id: "forest",   name: "Forest",   description: "Deep pine & moss",      swatch: ["#f0fdf4", "#166534", "#14532d", "#052e16"] },
  { id: "lavender", name: "Lavender", description: "Soft purple pastels",   swatch: ["#faf5ff", "#a855f7", "#7e22ce", "#3b0764"] },
  { id: "sakura",   name: "Sakura",   description: "Cherry blossom pink",   swatch: ["#fdf2f8", "#ec4899", "#be185d", "#831843"] },
  { id: "mono",     name: "Mono",     description: "Editorial black/white", swatch: ["#f5f5f4", "#292524", "#78716c", "#0c0a09"] },
  { id: "solar",    name: "Solar",    description: "Golden hour warmth",    swatch: ["#fefce8", "#eab308", "#a16207", "#3f2e0a"] },
  { id: "cyber",    name: "Cyber",    description: "Neon dark tech",        swatch: ["#020617", "#0f172a", "#22d3ee", "#a3e635"], dark: true },
];

type Ctx = { theme: ThemeId; setTheme: (t: ThemeId) => void };
const ThemeCtx = createContext<Ctx>({ theme: "harvest", setTheme: () => {} });

const STORAGE_KEY = "hiq-theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "harvest";
    return (localStorage.getItem(STORAGE_KEY) as ThemeId) || "harvest";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    const isDark = THEMES.find((t) => t.id === theme)?.dark;
    root.classList.toggle("dark", !!isDark);
  }, [theme]);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
};

export const useTheme = () => useContext(ThemeCtx);
