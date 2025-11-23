import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useTranslation, Language } from "@/hooks/useTranslation";

interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
];

export function LanguageSelector() {
  const { language, setLanguage } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode as Language);
  };

  // Asegurar que siempre haya un idioma válido, por defecto español
  const validLanguages: Language[] = ['es', 'en', 'fr', 'de', 'it', 'pt', 'zh', 'ar'];
  const currentLanguage = (language && validLanguages.includes(language)) ? language : 'es';
  const selectedLanguage = languages.find((lang) => lang.code === currentLanguage) || languages[0];

  // Si el idioma actual no es válido, actualizarlo a español
  React.useEffect(() => {
    if (!language || !validLanguages.includes(language)) {
      setLanguage('es');
    }
  }, [language, setLanguage]);

  return (
    <>
      <style>{`
        .language-selector-content {
          max-height: none !important;
        }
        .language-selector-content > div {
          max-height: none !important;
          overflow: visible !important;
        }
      `}</style>
      <div className="flex items-center relative">
        <Select value={currentLanguage} onValueChange={handleLanguageChange}>
          <SelectTrigger className="min-w-[150px] h-9 rounded-full border border-border/60 bg-white/90 px-4 text-sm font-medium shadow-sm hover:bg-accent/40 focus:ring-2 focus:ring-primary/30 focus:ring-offset-0">
            <SelectValue>
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{selectedLanguage.flag}</span>
                <span>{selectedLanguage.name}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent 
            side="bottom"
            align="end"
            sideOffset={8}
            avoidCollisions={true}
            collisionPadding={8}
            className="z-[9999] min-w-[180px] rounded-2xl border border-border/60 bg-white shadow-xl language-selector-content"
          >
            {languages.map((lang) => (
              <SelectItem
                key={lang.code}
                value={lang.code}
                className="text-sm font-medium cursor-pointer py-2.5"
              >
                <span className="flex items-center gap-3 w-full">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span className="flex-1">{lang.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
