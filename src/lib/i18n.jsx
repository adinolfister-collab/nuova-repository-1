import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dictionaries } from '@/lib/i18n/locales';
import { communityDict } from '@/lib/communityI18n';
import { base44 } from '@/api/base44Client';

const LanguageContext = createContext({ lang: 'it', t: (k) => k, setLang: () => {} });

// Legge ?lang= dall'URL (valido solo se tra le lingue supportate).
function getUrlLang() {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('lang');
  return v && dictionaries[v] ? v : null;
}

// Riscrive l'URL aggiungendo/aggiornando ?lang= senza ricaricare la pagina.
function syncUrlLang(l) {
  if (typeof window === 'undefined' || l === 'it') return;
  const url = new URL(window.location.href);
  url.searchParams.set('lang', l);
  window.history.replaceState({}, '', url.toString());
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const urlLang = getUrlLang();
    if (urlLang) {
      localStorage.setItem('ibd_lang', urlLang);
      return urlLang;
    }
    const saved = localStorage.getItem('ibd_lang');
    if (saved && dictionaries[saved]) return saved;
    const navLang = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) || 'it';
    const primary = String(navLang).toLowerCase().split('-')[0];
    return dictionaries[primary] ? primary : 'it';
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem('ibd_lang', l);
    syncUrlLang(l);
    // Persist to the user profile so backend functions can localize
    // notifications, emails and reports. Fire-and-forget: unauthenticated
    // users (guest/demo) only save locally and the call silently no-ops.
    base44.auth.updateMe({ lang: l }).catch(() => {});
  }, []);

  const t = useCallback((key) => {
    return (dictionaries[lang] && dictionaries[lang][key])
      || (dictionaries.it[key])
      || (communityDict[lang] && communityDict[lang][key])
      || (communityDict.it[key])
      || key;
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  return useContext(LanguageContext);
}