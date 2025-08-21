import React from 'react';
import { TranslationContext, useTranslationHook } from '@/hooks/useTranslation';

interface TranslationProviderProps {
  children: React.ReactNode;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const translation = useTranslationHook();
  
  return (
    <TranslationContext.Provider value={translation}>
      {children}
    </TranslationContext.Provider>
  );
};