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

const originals = new WeakMap<Text, string>();

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);

const isTranslatable = (node: Text): boolean => {
  const t = node.nodeValue;
  if (!t) return false;
  const trimmed = t.trim();
  if (!trimmed) return false;
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
  const isApplyingRef = useRef(false);

  const setLang = useCallback((l: string) => {
    localStorage.setItem(STORAGE_LANG, l);
    setLangState(l);
  }, []);

  // Apply only cached translations synchronously — no async work, no flicker.
  const applyCachedOnly = useCallback((root: Node = document.body) => {
    const target = langRef.current;
    document.documentElement.lang = target;
    document.documentElement.dir = RTL_LANGS.has(target) ? "rtl" : "ltr";

    const nodes = collectTextNodes(root);

    if (target === "en") {
      isApplyingRef.current = true;
      for (const n of nodes) {
        const o = originals.get(n);
        if (o !== undefined && n.nodeValue !== o) n.nodeValue = o;
      }
      isApplyingRef.current = false;
      return;
    }

    const cache = loadCache(target);
    isApplyingRef.current = true;
    for (const n of nodes) {
      let orig = originals.get(n);
      if (orig === undefined) {
        orig = n.nodeValue || "";
        originals.set(n, orig);
      }
      const key = orig.trim();
      if (!key) continue;
      const cached = cache.get(key);
      if (cached !== undefined && cached !== "") {
        const replaced = (orig as string).replace(key, cached);
        if (n.nodeValue !== replaced) n.nodeValue = replaced;
      } else {
        if (!pendingRef.current.has(key)) pendingRef.current.add(key);
      }
    }
    isApplyingRef.current = false;
  }, []);

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
      applyCachedOnly();
    } catch (e) {
      items.forEach((src) => { if (!cache.has(src)) cache.set(src, src); });
      persistCache(targetLang);
    }
  }, [applyCachedOnly]);

  const queueFlush = useCallback((targetLang: string) => {
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      const items = Array.from(pendingRef.current);
      pendingRef.current.clear();
      translateBatch(targetLang, items);
    }, 200);
  }, [translateBatch]);

  // Re-apply when language changes
  useEffect(() => {
    applyCachedOnly();
    if (pendingRef.current.size > 0) queueFlush(lang);
  }, [lang, applyCachedOnly, queueFlush]);

  // Mutation observer — apply cached translations IMMEDIATELY (sync) on any DOM change.
  // This eliminates the English flash on route changes.
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      if (isApplyingRef.current) return;
      let hasNewNodes = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0 || m.type === "characterData") {
          hasNewNodes = true;
          break;
        }
      }
      if (!hasNewNodes) return;
      applyCachedOnly();
      if (pendingRef.current.size > 0) queueFlush(langRef.current);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [applyCachedOnly, queueFlush]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
