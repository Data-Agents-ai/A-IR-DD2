import React, { createContext, useState, useCallback } from 'react';
import { Locale, locales, defaultLocale } from '../i18n/locales';

// Import all languages statically to avoid race conditions
import fr from '../i18n/fr';
import en from '../i18n/en';
import de from '../i18n/de';
import es from '../i18n/es';
import pt from '../i18n/pt';

type Translations = Record<string, string>;
const allTranslations: Record<Locale, Translations> = { fr, en, de, es, pt };

interface LocalizationContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

export const LocalizationContext = createContext<LocalizationContextType>({
    locale: defaultLocale,
    setLocale: () => null,
    t: (key) => key,
});

const getInitialLocale = (): Locale => {
    const savedLocale = localStorage.getItem('app-locale');
    if (savedLocale && locales[savedLocale as Locale]) {
        return savedLocale as Locale;
    }
    return defaultLocale;
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState<Locale>(getInitialLocale());

    const setLocale = useCallback((newLocale: Locale) => {
        localStorage.setItem('app-locale', newLocale);
        setLocaleState(newLocale);
    }, []);

    const t = useCallback((key: string, params: Record<string, string | number> = {}) => {
        const translations = allTranslations[locale] || allTranslations[defaultLocale];
        let translation = translations[key];
        
        if (!translation) {
            console.warn(`Translation key '${key}' not found for locale '${locale}'.`);
            return key;
        }

        Object.keys(params).forEach(paramKey => {
            const regex = new RegExp(`{${paramKey}}`, 'g');
            translation = translation.replace(regex, String(params[paramKey]));
        });

        return translation;
    }, [locale]);

    return (
        <LocalizationContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LocalizationContext.Provider>
    );
};
