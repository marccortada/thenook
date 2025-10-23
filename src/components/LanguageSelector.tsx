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

  const selectedLanguage = languages.find((lang) => lang.code === language);

  return (
    <div className="flex items-center">
      <Select value={language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="min-w-[150px] h-9 rounded-full border border-border/60 bg-white/90 px-4 text-sm font-medium shadow-sm hover:bg-accent/40 focus:ring-2 focus:ring-primary/30 focus:ring-offset-0">
          <SelectValue className="text-sm font-medium text-foreground" />
        </SelectTrigger>
        <SelectContent 
          position="popper"
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={20}
          className="z-[100] min-w-[170px] rounded-2xl border border-border/60 bg-white px-2 py-2 shadow-xl"
        >
          {languages.map((lang) => (
            <SelectItem
              key={lang.code}
              value={lang.code}
              className="text-sm font-medium"
            >
              <span className="flex items-center gap-3">
                <span className="text-base leading-none">{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
