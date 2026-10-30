import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations, languages, LanguageOption, getLocalizedCategoryName } from '../i18n';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  availableLanguages: LanguageOption[];
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  formatDate: (date: string | Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number) => string;
  translateCategory: (slugOrName: string) => string;
  translateStatus: (status: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'fixit_language';

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'am' || saved === 'om') {
    return saved;
  }
  return 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const { user, isAuthenticated } = useAuth();

  // Keep document html lang attribute updated
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Restore authenticated user's preferred language when they log in or profile is loaded
  useEffect(() => {
    if (isAuthenticated && user?.preferred_language) {
      const userLang = user.preferred_language as Language;
      if (userLang === 'en' || userLang === 'am' || userLang === 'om') {
        if (userLang !== language) {
          setLanguageState(userLang);
          localStorage.setItem(STORAGE_KEY, userLang);
        }
      }
    }
  }, [isAuthenticated, user?.preferred_language]);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    document.documentElement.lang = newLang;

    // If authenticated, persist to user account in backend
    if (isAuthenticated) {
      api.patch('/accounts/me/', { preferred_language: newLang }).catch(() => {
        // Silently tolerate if offline or network issue
      });
    }
  }, [isAuthenticated]);

  // Safe nested translation lookup with parameter interpolation
  const t = useCallback((keyPath: string, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    const parts = keyPath.split('.');
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English dictionary
        let fallback: any = translations.en;
        for (const fbPart of parts) {
          if (fallback && typeof fallback === 'object' && fbPart in fallback) {
            fallback = fallback[fbPart];
          } else {
            fallback = undefined;
            break;
          }
        }
        current = fallback !== undefined ? fallback : keyPath;
        break;
      }
    }

    if (typeof current !== 'string') {
      return keyPath;
    }

    // Replace {paramName} placeholders
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, val]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      }, current);
    }

    return current;
  }, [language]);

  // Locale-aware Date formatting
  const formatDate = useCallback((dateVal: string | Date | number, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const date = typeof dateVal === 'string' || typeof dateVal === 'number' ? new Date(dateVal) : dateVal;
      const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-US';
      const defaultOptions: Intl.DateTimeFormatOptions = options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
    } catch {
      return String(dateVal);
    }
  }, [language]);

  // Locale-aware Number formatting
  const formatNumber = useCallback((num: number): string => {
    try {
      const locale = language === 'am' ? 'am-ET' : language === 'om' ? 'om-ET' : 'en-US';
      return new Intl.NumberFormat(locale).format(num);
    } catch {
      return String(num);
    }
  }, [language]);

  // Localized Category
  const translateCategory = useCallback((slugOrName: string): string => {
    return getLocalizedCategoryName(slugOrName, language);
  }, [language]);

  // Localized Status
  const translateStatus = useCallback((statusCode: string): string => {
    const s = statusCode.toLowerCase();
    const dict = translations[language].status;
    switch (s) {
      case 'pending':
        return dict.pending;
      case 'accepted':
        return dict.accepted;
      case 'in_progress':
        return dict.in_progress;
      case 'completed':
        return dict.completed;
      case 'cancelled':
        return dict.cancelled;
      case 'declined':
        return dict.declined;
      case 'declined_by_all':
        return dict.declined_by_all;
      case 'superseded':
        return dict.superseded;
      case 'approved':
        return dict.approved;
      case 'rejected':
        return dict.rejected;
      default:
        return statusCode;
    }
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        availableLanguages: languages,
        t,
        formatDate,
        formatNumber,
        translateCategory,
        translateStatus,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Convenient alias
export const useTranslation = useLanguage;
