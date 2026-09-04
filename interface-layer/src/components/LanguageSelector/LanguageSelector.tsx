import React from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../../types/api';

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
  disabled = false,
}) => {
  return (
    <div
      className="flex items-center bg-[#1C1612] p-1 border border-[#3E322A]"
      role="group"
      aria-label="Language selector"
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isActive = currentLanguage === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            disabled={disabled}
            onClick={() => onLanguageChange(lang.code)}
            aria-pressed={isActive}
            className={`px-2.5 py-1 text-xs font-bold uppercase transition-all tracking-wider ${
              isActive
                ? 'bg-[#704832] text-[#FFFDF8] shadow-xs font-extrabold'
                : 'text-[#D8CCBC] hover:text-[#FFFDF8] hover:bg-[#362B23]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={`${lang.label} (${lang.nativeLabel})`}
          >
            <span className="hidden sm:inline">{lang.label}</span>
            <span className="sm:hidden">{lang.code.toUpperCase()}</span>
            <span className="ml-1 opacity-75 font-normal text-[10px]">
              {lang.code !== 'en' ? `(${lang.nativeLabel})` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
};
