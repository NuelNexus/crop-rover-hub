import { useTheme, THEMES, ThemeId } from "@/contexts/ThemeContext";
import { Check, Palette } from "lucide-react";

const ThemePicker = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-display font-semibold text-base">Theme</h3>
          <p className="text-xs text-muted-foreground">Personalise the look and feel across the app</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {THEMES.map((t) => {
          const active = t.id === theme;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as ThemeId)}
              className={`group relative rounded-2xl border-2 transition-all overflow-hidden text-left ${
                active ? "border-primary shadow-lg scale-[1.02]" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex h-16">
                {t.swatch.map((c, i) => (
                  <div key={i} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <div className="p-3 bg-card">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{t.name}</p>
                  {active && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemePicker;
