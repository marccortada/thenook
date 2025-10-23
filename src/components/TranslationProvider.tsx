import React from 'react';
import { TranslationContext, useTranslationHook } from '@/hooks/useTranslation';

interface TranslationProviderProps {
  children: React.ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const translation = useTranslationHook();
  
  // Sync document language + direction (for Arabic RTL)
  React.useEffect(() => {
    const lang = translation.language || 'es';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [translation.language]);
  
  return (
    <TranslationContext.Provider value={translation}>
      {children}
    </TranslationContext.Provider>
  );
};
