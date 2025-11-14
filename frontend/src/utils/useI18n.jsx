import { useState, useEffect, createContext, useContext } from 'react';
import { getLocale, setLocale, subscribeToLocale, t as translate } from './i18n';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const unsubscribe = subscribeToLocale((newLocale) => {
      setLocaleState(newLocale);
    });
    return unsubscribe;
  }, []);

  const changeLocale = (newLocale) => {
    setLocale(newLocale);
  };

  const t = (key, params) => translate(key, params);

  return (
    <I18nContext.Provider value={{ locale, changeLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback if not in provider
    return {
      locale: getLocale(),
      changeLocale: setLocale,
      t: translate,
    };
  }
  return context;
}

