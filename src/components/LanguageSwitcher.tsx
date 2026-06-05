import { useState, useMemo } from "react";
import { Languages, Search, Check } from "lucide-react";
import { LANGUAGES } from "@/i18n/languages";
import { useLanguage } from "@/i18n/LanguageProvider";

const LanguageSwitcher = () => {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return LANGUAGES;
    return LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(t) || l.native.toLowerCase().includes(t) || l.code.toLowerCase().includes(t)
    );
  }, [q]);

  return (
    <div className="relative" data-no-translate="true">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
        title="Change language"
      >
        <Languages className="w-5 h-5" />
        <span className="flex-1 text-left truncate">{current.native}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-72 max-h-96 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  placeholder="Search language…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setOpen(false); setQ(""); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-secondary text-foreground ${
                    l.code === lang ? "bg-secondary font-semibold" : ""
                  }`}
                >
                  <span className="flex-1 truncate">{l.native}</span>
                  <span className="text-xs text-muted-foreground">{l.name}</span>
                  {l.code === lang && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">No match</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
