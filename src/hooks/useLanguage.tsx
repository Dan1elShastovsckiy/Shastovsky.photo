import React, { useState, useEffect, createContext, useContext } from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lang') as Language;
      if (saved) return saved;
      return navigator.language.startsWith('ru') ? 'ru' : 'en';
    }
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lang', lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (newLang: Language) => setLangState(newLang);
  const toggleLang = () => setLangState(prev => prev === 'en' ? 'ru' : 'en');

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
