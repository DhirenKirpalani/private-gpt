"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { translations, type Language, type TranslationKey } from "./translations";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  toggleLang: () => void;
  dict: (typeof translations)[Language];
  customTrans: Partial<Record<TranslationKey, string>>;
  saveCustomTrans: (overrides: Partial<Record<TranslationKey, string>>) => void;
}

const STORAGE_KEY = "exploro-lang";
const CUSTOM_TRANS_KEY = "exploro-custom-trans";

function loadCustomTrans(): Partial<Record<TranslationKey, string>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CUSTOM_TRANS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLang(): Language {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === "en" || stored === "es") return stored;
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("es")) return "es";
  }
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);
  const [customTrans, setCustomTransState] = useState<Partial<Record<TranslationKey, string>>>({});

  useEffect(() => {
    setLangState(getInitialLang());
    setCustomTransState(loadCustomTrans());
    setMounted(true);
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "es" : "en");
  }, [lang, setLang]);

  const saveCustomTrans = useCallback((overrides: Partial<Record<TranslationKey, string>>) => {
    setCustomTransState(overrides);
    if (typeof window !== "undefined") {
      localStorage.setItem(CUSTOM_TRANS_KEY, JSON.stringify(overrides));
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text = (customTrans[key] ?? translations[lang][key] ?? translations.en[key] ?? key) as string;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
        });
      }
      return text;
    },
    [lang, customTrans]
  );

  const mergedDict = useMemo(() => {
    return { ...translations[lang], ...customTrans } as (typeof translations)[Language];
  }, [lang, customTrans]);

  const value: I18nContextValue = {
    lang,
    setLang,
    t,
    toggleLang,
    dict: mergedDict,
    customTrans,
    saveCustomTrans,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
