import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RTL_LANGS } from "./languages";

type Ctx = {
  lang: string;
  setLang: (l: string) => void;
};

const LanguageContext = createContext<Ctx>({ lang: "en", setLang: () => {} });
export const useLanguage = () => useContext(LanguageContext);

const STORAGE_LANG = "harvestiq.lang";
const CACHE_PREFIX = "harvestiq.i18n.";

// In-memory cache: lang -> map(original -> translated)
const memCache: Record<string, Map<string, string>> = {};

const loadCache = (lang: string): Map<string, string> => {
  if (memCache[lang]) return memCache[lang];
  const m = new Map<string, string>();
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + lang);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, string>;
      for (const k in obj) m.set(k, obj[k]);
    }
  } catch {}
  memCache[lang] = m;
  return m;
};

const persistCache = (lang: string) => {
  const m = memCache[lang]; if (!m) return;
  try {
    const obj: Record<string, string> = {};
    m.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(obj));
  } catch {}
};

// Originals keyed by Text node (so we can restore on language switch)
const originals = new WeakMap<Text, string>();
const translatedNodes = new WeakSet<Text>();

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);

const isTranslatable = (node: Text): boolean => {
  const t = node.nodeValue;
  if (!t) return false;
  const trimmed = t.trim();
  if (!trimmed) return false;
  // Skip pure numbers / symbols
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  let p: Node | null = node.parentNode;
  while (p && p.nodeType === 1) {
    const el = p as Element;
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (el.getAttribute("data-no-translate") === "true") return false;
    if (el.getAttribute("contenteditable") === "true") return false;
    p = p.parentNode;
  }
  return true;
};

const collectTextNodes = (root: Node): Text[] => {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (isTranslatable(n as Text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<string>(() => localStorage.getItem(STORAGE_LANG) || "en");
  const langRef = useRef(lang);
  langRef.current = lang;

  const pendingRef = useRef<Set<string>>(new Set());
  const flushTimer = useRef<number | null>(null);

  const setLang = useCallback((l: string) => {
    localStorage.setItem(STORAGE_LANG, l);
    setLangState(l);
  }, []);

  // Translate a batch of strings via edge function, fill cache, then re-apply DOM
  const translateBatch = useCallback(async (targetLang: string, items: string[]) => {
    if (items.length === 0) return;
    const cache = loadCache(targetLang);
    try {
      const { data, error } = await supabase.functions.invoke("translate-ui", {
        body: { strings: items, target: targetLang, targetName: targetLang },
      });
      if (error) throw error;
      const translations: string[] = data?.translations || [];
      items.forEach((src, i) => { cache.set(src, translations[i] ?? src); });
      persistCache(targetLang);
      applyTranslations();
    } catch (e) {
      // mark as identity so we don't keep retrying
      items.forEach((src) => { if (!cache.has(src)) cache.set(src, src); });
      persistCache(targetLang);
    }
  }, []);

  const queueFlush = useCallback((targetLang: string) => {
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(() => {
      const items = Array.from(pendingRef.current);
      pendingRef.current.clear();
      translateBatch(targetLang, items);
    }, 250);
  }, [translateBatch]);

  const applyTranslations = useCallback(() => {
    const target = langRef.current;
    document.documentElement.lang = target;
    document.documentElement.dir = RTL_LANGS.has(target) ? "rtl" : "ltr";

    const nodes = collectTextNodes(document.body);

    if (target === "en") {
      // restore originals
      for (const n of nodes) {
        const o = originals.get(n);
        if (o !== undefined && n.nodeValue !== o) n.nodeValue = o;
        translatedNodes.delete(n);
      }
      return;
    }

    const cache = loadCache(target);
    const missing: string[] = [];

    for (const n of nodes) {
      let orig = originals.get(n);
      if (orig === undefined) {
        orig = n.nodeValue || "";
        originals.set(n, orig);
      }
      const key = orig.trim();
      if (!key) continue;
      const cached = cache.get(key);
      if (cached !== undefined) {
        const replaced = (orig as string).replace(key, cached);
        if (n.nodeValue !== replaced) n.nodeValue = replaced;
        translatedNodes.add(n);
      } else {
        if (!pendingRef.current.has(key)) pendingRef.current.add(key);
      }
    }

    if (pendingRef.current.size > 0) queueFlush(target);
  }, [queueFlush]);

  // Re-apply when language changes
  useEffect(() => {
    applyTranslations();
  }, [lang, applyTranslations]);

  // Mutation observer for dynamic content
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      // Quick check: only run if anything new with text
      let interesting = false;
      for (const m of mutations) {
        if (m.type === "characterData" || m.addedNodes.length > 0) { interesting = true; break; }
      }
      if (!interesting) return;
      // Throttle
      if (flushTimer.current) return;
      window.setTimeout(() => applyTranslations(), 100);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [applyTranslations]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
