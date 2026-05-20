import { useMemo } from "react";

export type SceneKind = "sun" | "clouds" | "rain" | "thunder" | "snow" | "wind";

export const codeToScene = (code?: number): SceneKind => {
  if (code === undefined || code === null) return "clouds";
  if (code === 0) return "sun";
  if ([1, 2].includes(code)) return "clouds";
  if ([3, 45, 48].includes(code)) return "wind";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([95, 96, 99].includes(code)) return "thunder";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  return "clouds";
};

const bgFor: Record<SceneKind, string> = {
  sun: "from-amber-200 via-orange-100 to-sky-200",
  clouds: "from-sky-200 via-blue-100 to-slate-200",
  rain: "from-slate-400 via-slate-300 to-slate-200",
  thunder: "from-slate-700 via-slate-600 to-slate-500",
  snow: "from-sky-100 via-white to-slate-100",
  wind: "from-emerald-100 via-sky-100 to-slate-200",
};

const Cloud = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute rounded-full bg-white/90 shadow-md ${className}`} style={style} />
);

const WeatherScene = ({ kind, label, temp }: { kind: SceneKind; label?: string; temp?: number }) => {
  const drops = useMemo(() => Array.from({ length: kind === "thunder" ? 60 : 30 }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 0.6 + Math.random() * 0.6,
    length: kind === "thunder" ? 22 : 14,
  })), [kind]);

  const flakes = useMemo(() => Array.from({ length: 40 }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 6 + Math.random() * 6,
    size: 3 + Math.random() * 5,
  })), []);

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bgFor[kind]} h-72 sm:h-80 shadow-lg`}>
      {/* Sun */}
      {(kind === "sun" || kind === "clouds") && (
        <div
          className="absolute rounded-full bg-yellow-300 shadow-[0_0_80px_30px_rgba(253,224,71,0.6)]"
          style={{
            width: 90, height: 90,
            top: kind === "sun" ? "30%" : "12%",
            right: kind === "sun" ? "38%" : "12%",
            animation: "ws-pulse 4s ease-in-out infinite",
          }}
        />
      )}
      {kind === "sun" && (
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: "conic-gradient(from 0deg, rgba(253,224,71,0.0), rgba(253,224,71,0.5), rgba(253,224,71,0.0) 25%, rgba(253,224,71,0.5) 50%, rgba(253,224,71,0.0) 75%)",
            animation: "ws-spin 24s linear infinite",
          }}
        />
      )}

      {/* Clouds */}
      {kind !== "sun" && (
        <>
          <Cloud className="w-40 h-12" style={{ top: "18%", left: "-10%", animation: "ws-drift 24s linear infinite" }} />
          <Cloud className="w-56 h-14" style={{ top: "10%", left: "30%", animation: "ws-drift 36s linear infinite", animationDelay: "-12s" }} />
          <Cloud className="w-32 h-10" style={{ top: "32%", left: "60%", animation: "ws-drift 28s linear infinite", animationDelay: "-6s" }} />
        </>
      )}

      {/* Rain */}
      {(kind === "rain" || kind === "thunder") && drops.map((d, i) => (
        <span
          key={i}
          className={`absolute top-0 ${kind === "thunder" ? "bg-slate-200/70" : "bg-blue-500/70"} rounded-full`}
          style={{
            left: `${d.left}%`,
            width: 2,
            height: d.length,
            animation: `ws-rain ${d.duration}s linear ${d.delay}s infinite`,
          }}
        />
      ))}

      {/* Lightning */}
      {kind === "thunder" && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ animation: "ws-flash 6s ease-out infinite", opacity: 0 }}
        />
      )}

      {/* Snow */}
      {kind === "snow" && flakes.map((f, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white shadow"
          style={{
            left: `${f.left}%`,
            top: `-${f.size}px`,
            width: f.size,
            height: f.size,
            animation: `ws-snow ${f.duration}s linear ${f.delay}s infinite`,
          }}
        />
      ))}

      {/* Wind streaks */}
      {kind === "wind" && Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-0.5 bg-white/60 rounded-full"
          style={{
            top: `${10 + i * 7}%`,
            left: "-30%",
            width: `${80 + Math.random() * 120}px`,
            animation: `ws-wind ${2 + Math.random() * 2}s linear ${Math.random() * 2}s infinite`,
          }}
        />
      ))}

      {/* Label */}
      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between text-white drop-shadow">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-90">Live scene</p>
          <p className="font-display text-2xl font-bold capitalize">{label || kind}</p>
        </div>
        {temp !== undefined && (
          <p className="font-display text-5xl font-bold">{Math.round(temp)}°</p>
        )}
      </div>

      <style>{`
        @keyframes ws-drift { from { transform: translateX(0); } to { transform: translateX(140%); } }
        @keyframes ws-rain { 0% { transform: translateY(-20px); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(320px); opacity: 0; } }
        @keyframes ws-snow { 0% { transform: translate(0,0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(40px, 320px); opacity: 0.2; } }
        @keyframes ws-wind { 0% { transform: translateX(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateX(160vw); opacity: 0; } }
        @keyframes ws-flash { 0%, 92%, 100% { opacity: 0; } 93% { opacity: 0.8; } 94% { opacity: 0.1; } 95% { opacity: 0.6; } 96% { opacity: 0; } }
        @keyframes ws-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes ws-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default WeatherScene;
