import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('nav.toggle_theme')}
      className={`grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 ${className}`}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        aria-label={t('nav.light_mode')}
        className={`flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          theme === 'light'
            ? 'bg-white text-amber-600 shadow-2xs font-bold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Sun size={14} className={theme === 'light' ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'} />
        <span>{t('nav.light_mode')}</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        aria-label={t('nav.dark_mode')}
        className={`flex items-center justify-center space-x-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          theme === 'dark'
            ? 'bg-slate-900 text-indigo-400 shadow-2xs font-bold dark:bg-slate-700 dark:text-indigo-300'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Moon size={14} className={theme === 'dark' ? 'text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
        <span>{t('nav.dark_mode')}</span>
      </button>
    </div>
  );
};
