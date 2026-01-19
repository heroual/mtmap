
import React from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../lib/i18n/config';

const LanguageSwitcher: React.FC = () => {
  // We use useTranslation to ensure the component re-renders when language changes
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    // Prefer the imported instance to ensure method availability
    if (i18nInstance && typeof i18nInstance.changeLanguage === 'function') {
      i18nInstance.changeLanguage(lng);
    } else if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(lng);
    } else {
      console.error("i18n instance not found or changeLanguage is not a function");
    }
  };

  // Safe fallback hierarchy for current language detection
  const currentLang = i18n?.language || i18nInstance?.language || 'fr';

  return (
    <div className="flex bg-slate-100 dark:bg-slate-900/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-full">
      <button
        onClick={() => changeLanguage('fr')}
        className={`flex-1 py-1 text-xs font-bold rounded-md transition-all duration-200 ${
          currentLang.startsWith('fr')
            ? 'bg-white text-iam-red shadow-md dark:bg-cyan-600 dark:text-white dark:shadow-lg'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        FR 🇫🇷
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`flex-1 py-1 text-xs font-bold rounded-md transition-all duration-200 ${
          currentLang.startsWith('en')
            ? 'bg-white text-iam-red shadow-md dark:bg-cyan-600 dark:text-white dark:shadow-lg'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        EN 🇬🇧
      </button>
    </div>
  );
};

export default LanguageSwitcher;
