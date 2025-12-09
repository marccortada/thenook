import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ViewportSafeWrapper } from "@/components/ViewportSafeWrapper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft, X, Settings } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import OptimizedImage from "@/components/OptimizedImage";
import { StripeCheckoutModal } from "@/components/StripeCheckoutModal";
import { PaymentMethodsInfo } from "@/components/PaymentMethodsInfo";
import { useTranslation, findTranslationKeyByValue } from "@/hooks/useTranslation";

interface CartItem {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
}

type GiftType = "fixed" | "custom";

interface GiftCardItem {
  id: string;
  name: string;
  type: GiftType;
  priceCents?: number; // only for fixed
  imageUrl?: string | null;
  description?: string;
  sessionsCount?: number;
  groupKey?: string | null;
}

const euro = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100
  );

// Custom gift card - will be translated dynamically in component

const PREDEFINED_GIFTS: GiftCardItem[] = [
  { id: 'gift-1', name: 'Piernas Cansadas', type: 'fixed', priceCents: 4000 },
  { id: 'gift-3', name: 'Masaje Descontracturante 55 minutos', type: 'fixed', priceCents: 5500 },
  { id: 'gift-4', name: 'Reflexología Podal', type: 'fixed', priceCents: 6000 },
  { id: 'gift-5', name: 'Shiatsu', type: 'fixed', priceCents: 6500 },
  { id: 'gift-6', name: 'Masaje para Embarazada 50 minutos', type: 'fixed', priceCents: 6000 },
  { id: 'gift-7', name: 'Masaje Relajante 55 minutos', type: 'fixed', priceCents: 5500 },
  { id: 'gift-8', name: 'Masaje Deportivo 50 minutos', type: 'fixed', priceCents: 6000 },
  { id: 'gift-9', name: 'Masaje con Piedras Calientes', type: 'fixed', priceCents: 6500 },
  { id: 'gift-10', name: 'Bambuterapia Masaje con Cañas de Bambú', type: 'fixed', priceCents: 6500 },
  { id: 'gift-11', name: 'Ritual Romántico Individual', type: 'fixed', priceCents: 7000 },
  { id: 'gift-12', name: 'Ritual Energizante Individual', type: 'fixed', priceCents: 7000 },
  { id: 'gift-13', name: 'Drenaje Linfático 75 minutos', type: 'fixed', priceCents: 7500 },
  { id: 'gift-14', name: 'Antiestrés The Nook', type: 'fixed', priceCents: 7500 },
  { id: 'gift-15', name: 'Masaje para Embarazada 75 minutos', type: 'fixed', priceCents: 7500 },
  { id: 'gift-16', name: 'Masaje Descontracturante 75 minutos', type: 'fixed', priceCents: 7500 },
  { id: 'gift-17', name: 'Masaje dos Personas 45 minutos', type: 'fixed', priceCents: 9000 },
  { id: 'gift-18', name: 'Ritual del Kobido Individual', type: 'fixed', priceCents: 8500 },
  { id: 'gift-19', name: 'Masaje 90 minutos', type: 'fixed', priceCents: 9000 },
  { id: 'gift-20', name: 'Ritual Sakura Individual', type: 'fixed', priceCents: 9000 },
  { id: 'gift-21', name: 'Masaje dos Personas 55 minutos', type: 'fixed', priceCents: 9900 },
  { id: 'gift-22', name: 'Masaje a Cuatro Manos 50 minutos', type: 'fixed', priceCents: 10500 },
  { id: 'gift-23', name: 'Masaje Relajante Extra Largo 110 minutos', type: 'fixed', priceCents: 11500 },
  { id: 'gift-24', name: 'Bambuterapia Masaje con Cañas de Bambú para dos Personas', type: 'fixed', priceCents: 12000 },
  { id: 'gift-25', name: 'Masaje con Piedras Calientes para dos personas', type: 'fixed', priceCents: 11000 },
  { id: 'gift-26', name: 'Ritual Beauty Individual', type: 'fixed', priceCents: 12000 },
  { id: 'gift-27', name: 'Ritual Energizante para dos Personas', type: 'fixed', priceCents: 12000 },
  { id: 'gift-28', name: 'Ritual Romántico para dos Personas', type: 'fixed', priceCents: 11500 },
  { id: 'gift-29', name: 'Masaje dos Personas 75 minutos', type: 'fixed', priceCents: 13500 },
  { id: 'gift-30', name: 'Masaje a Cuatro Manos 80 minutos', type: 'fixed', priceCents: 16000 },
  { id: 'gift-31', name: 'Ritual del Kobido para dos Personas', type: 'fixed', priceCents: 15500 },
  { id: 'gift-32', name: 'Masaje dos Personas 110 minutos', type: 'fixed', priceCents: 18000 },
  { id: 'gift-33', name: 'Ritual Sakura para dos Personas', type: 'fixed', priceCents: 17500 },
  { id: 'gift-34', name: 'Ritual Beauty para dos Personas', type: 'fixed', priceCents: 23000 },
  { id: 'gift-35', name: 'BONO 5 masajes para Embarazada', type: 'fixed', priceCents: 26400 },
  { id: 'gift-36', name: 'BONO 5 masajes Reductor Anticelulítico', type: 'fixed', priceCents: 26400 },
  { id: 'gift-37', name: 'BONO 5 masajes 55 minutos', type: 'fixed', priceCents: 26400 },
  { id: 'gift-38', name: 'BONO 5 masajes 75 minutos', type: 'fixed', priceCents: 35500 },
  { id: 'gift-39', name: 'BONO 5 masajes dos Personas 45 minutos', type: 'fixed', priceCents: 39600 },
  { id: 'gift-40', name: 'BONO 10 masajes 55 minutos', type: 'fixed', priceCents: 51000 },
  { id: 'gift-41', name: 'BONO 10 masajes Reductor Anticelulítico', type: 'fixed', priceCents: 51000 },
  { id: 'gift-42', name: 'BONO 10 masajes para Embarazada', type: 'fixed', priceCents: 51000 },
  { id: 'gift-43', name: 'BONO 5 masajes dos Personas 75 minutos', type: 'fixed', priceCents: 61500 },
];

const DEFAULT_GIFT_IMAGE = '/lovable-uploads/a67f856f-f685-4134-9b22-730c400d6266.png';
const GIFT_IMAGE_PROPS = { width: 360, height: 270, quality: 70 } as const;

// Simple local cart (persisted to localStorage)
// Heurísticas de categorías
const isDuo = (name?: string) => {
  const txt = (name || "").toLowerCase();
  return /(dos|pareja|parejas|dúo|duo)/.test(txt) || /\b2\s*personas?\b/.test(txt) || /para\s*2\s*personas?/.test(txt) || /\b(2p|2\s*pax)\b/.test(txt);
};
const isCuatroManos = (name?: string) => !!name?.toLowerCase().includes("cuatro manos");
const isRitual = (name?: string) => !!name?.toLowerCase().includes("ritual");

const GiftCardsPage = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Debug log para monitorear cambios en isCartOpen
  useEffect(() => {
    console.log("📱 Estado isCartOpen cambió a:", isCartOpen);
  }, [isCartOpen]);
  const [giftOptions, setGiftOptions] = useState<any[]>([]);
  const [purchasedByName, setPurchasedByName] = useState("");
  const [purchasedByEmail, setPurchasedByEmail] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  
  // Nuevas opciones para tarjetas de regalo
  const [showPrice, setShowPrice] = useState(true);
  const [sendToBuyer, setSendToBuyer] = useState(true); // true = comprador, false = beneficiario
  const [showBuyerData, setShowBuyerData] = useState(true);
  
  // Estados para el modal de Stripe
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  
  // Estados para tarjetas regalo personalizadas
  const [customGiftDialogs, setCustomGiftDialogs] = useState<Record<string, boolean>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  
  const { t, language } = useTranslation();

  // Efecto para seguir al modal cuando se abre
  useEffect(() => {
    if (isCartOpen) {
      setTimeout(() => {
        const modalElement = document.querySelector('[role="dialog"]');
        if (modalElement) {
          modalElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      }, 100);
    }
  }, [isCartOpen]);

  // Función para traducir nombres de paquetes/tarjetas
  const translatePackageName = (name: string) => {
    // Limpiar el nombre quitando "TARJETA REGALO" y texto extra
    const cleanName = name
      .replace(/\s*TARJETA\s*REGALO\s*$/i, '')
      .trim();
    
    // Normalizar el nombre para usar como clave de traducción
    const normalizedKey = cleanName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/'/g, '')
      .replace(/[^\w_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Mapeo directo de traducciones como fallback
    const translationMap: Record<string, Record<string, string>> = {
      'piernas_cansadas': {
        'en': 'Tired Legs Massage',
        'fr': 'Jambes Fatiguées',
        'de': 'Müde Beine',
        'it': 'Gambe Stanche',
        'pt': 'Pernas Cansadas'
      },
      'masaje_para_embarazada_50_minutos': {
        'en': '50-Minute Pregnancy Massage',
        'fr': 'Massage Prénatal 50 minutes',
        'de': 'Schwangerschaftsmassage 50 Minuten',
        'it': 'Massaggio Prenatale 50 minuti',
        'pt': 'Massagem Pré-natal 50 minutos'
      },
      'masaje_deportivo_50_minutos': {
        'en': '50-Minute Sports Massage',
        'fr': 'Massage Sportif 50 minutes',
        'de': 'Sportmassage 50 Minuten',
        'it': 'Massaggio Sportivo 50 minuti',
        'pt': 'Massagem Desportiva 50 minutos'
      },
      'shiatsu': {
        'en': 'Shiatsu',
        'fr': 'Shiatsu',
        'de': 'Shiatsu',
        'it': 'Shiatsu',
        'pt': 'Shiatsu'
      },
      'masaje_descontracturante_55_minutos': {
        'en': '55-Minute Therapeutic Massage',
        'fr': 'Massage Thérapeutique 55 minutes',
        'de': 'Therapeutische Massage 55 Minuten',
        'it': 'Massaggio Terapeutico 55 minuti',
        'pt': 'Massagem Terapêutica 55 minutos'
      },
      'masaje_relajante_55_minutos': {
        'en': '55-Minute Relaxing Massage',
        'fr': 'Massage Relaxant 55 minutes',
        'de': 'Entspannungsmassage 55 Minuten',
        'it': 'Massaggio Rilassante 55 minuti',
        'pt': 'Massagem Relaxante 55 minutos'
      },
      'reflexologia_podal': {
        'en': 'Foot Reflexology',
        'fr': 'Réflexologie Plantaire',
        'de': 'Fußreflexzonenmassage',
        'it': 'Riflessologia Plantare',
        'pt': 'Reflexologia Plantar'
      }
    };

    const currentLang = (language || 'es') as keyof typeof translationMap[keyof typeof translationMap];

    // En español usamos siempre el nombre original almacenado en la base de datos
    if (currentLang === 'es') {
      return cleanName;
    }

    // Intentar usar el sistema de traducciones primero, con fallback al mapeo directo
    try {
      const translation = t(normalizedKey as any);
      if (translation !== normalizedKey) {
        return translation;
      }
    } catch (error) {
      console.warn('Translation system error, using fallback');
    }

    const fallbackKey = findTranslationKeyByValue(cleanName);
    if (fallbackKey) {
      const localized = t(fallbackKey);
      if (localized && localized !== fallbackKey) return localized;
    }
    
    const mapping = translationMap[normalizedKey];
    if (mapping && mapping[currentLang]) return mapping[currentLang];
    if (mapping && mapping['es']) return mapping['es'];
    
    // Si no hay traducción, devolver nombre limpio
    return cleanName;
  };

  // Hook para manejo del carrito local
  const useLocalCart = () => {
    const CART_TTL_MS = 1000 * 60 * 10; // 10 minutos

    const [items, setItems] = useState<CartItem[]>(() => {
      try {
        const raw = localStorage.getItem("cart:giftcards");
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        const savedAt = typeof parsed?.savedAt === "number" ? parsed.savedAt : Date.now();
        const storedItems = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];

        if (Date.now() - savedAt > CART_TTL_MS) {
          localStorage.removeItem("cart:giftcards");
          return [];
        }
        return storedItems as CartItem[];
      } catch {
        return [];
      }
    });

    const [lastUpdated, setLastUpdated] = useState<number>(() => {
      try {
        const raw = localStorage.getItem("cart:giftcards");
        if (!raw) return Date.now();
        const parsed = JSON.parse(raw);
        return typeof parsed?.savedAt === "number" ? parsed.savedAt : Date.now();
      } catch {
        return Date.now();
      }
    });

    useEffect(() => {
      if (items.length === 0) {
        localStorage.removeItem("cart:giftcards");
        return;
      }
      localStorage.setItem("cart:giftcards", JSON.stringify({ items, savedAt: lastUpdated }));
    }, [items, lastUpdated]);

    useEffect(() => {
      if (items.length === 0) return;
      const remaining = lastUpdated + CART_TTL_MS - Date.now();
      if (remaining <= 0) {
        setItems([]);
        return;
      }
      const timer = window.setTimeout(() => setItems([]), remaining);
      return () => window.clearTimeout(timer);
    }, [items.length, lastUpdated]);

    const add = (item: Omit<CartItem, "quantity" | "id"> & { quantity?: number }) => {
      setItems((prev) => {
        const idx = prev.findIndex(
          (i) => i.name === item.name && i.priceCents === item.priceCents
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + (item.quantity ?? 1) };
          return copy;
        }
        return [
          ...prev,
          { id: crypto.randomUUID(), name: item.name, priceCents: item.priceCents, quantity: item.quantity ?? 1 },
        ];
      });
      setLastUpdated(Date.now());
      toast.success(t('added_to_cart'));
    };

    const remove = (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setLastUpdated(Date.now());
    };

    const clear = () => {
      setItems([]);
      setLastUpdated(Date.now());
    };

    const totalCents = useMemo(
      () => items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
      [items]
    );

    return { items, add, remove, clear, totalCents };
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from('gift_card_options')
        .select('*')
        .eq('is_active', true)
        .order('amount_cents', { ascending: true });
      if (!error) setGiftOptions(data || []);
    })();
  }, []);

  const normalize = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  const parseGiftGroup = (description?: string) => {
    const regex = /\[GROUP:([a-zA-Z0-9_-]+)\]/i;
    const match = description?.match(regex);
    const cleanDescription = (description || '').replace(regex, '').trim();
    return {
      group: match?.[1] || null,
      cleanDescription
    };
  };

  const giftItems: GiftCardItem[] = useMemo(() => {
    return (giftOptions || []).map((option: any) => ({
      id: option.id,
      name: option.name,
      type: 'fixed' as GiftType,
      priceCents: option.amount_cents,
      ...(() => {
        const parsed = parseGiftGroup(option.description);
        return {
          description: parsed.cleanDescription,
          groupKey: parsed.group
        };
      })(),
      imageUrl: option.image_url || DEFAULT_GIFT_IMAGE,
      sessionsCount: typeof option.sessions_count === 'number'
        ? option.sessions_count
        : parseInt(option.sessions_count || '0', 10) || 0
    }));
  }, [giftOptions]);

  const groups = useMemo(() => {
    const buckets: Record<string, GiftCardItem[]> = {
      individual: [],
      pareja: [],
      cuatro: [],
      ritual_individual: [],
      ritual_dos: [],
      multi: [],
    };

    giftItems.forEach((item: any) => {
      const key = item.groupKey as string | null;
      const name = item.name;
      const assign = (bucket: keyof typeof buckets) => buckets[bucket].push(item);

      if (key) {
        switch (key) {
          case 'individual': return assign('individual');
          case 'pareja': return assign('pareja');
          case 'cuatro': return assign('cuatro');
          case 'ritual_individual': return assign('ritual_individual');
          case 'ritual_dos': return assign('ritual_dos');
          case 'multi': return assign('multi');
          default: break;
        }
      }

      if (isCuatroManos(name)) return assign('cuatro');
      if (isRitual(name) && isDuo(name)) return assign('ritual_dos');
      if (isRitual(name)) return assign('ritual_individual');
      if (isDuo(name)) return assign('pareja');
      return assign('individual');
    });

    return {
      individuales: buckets.individual,
      paraDos: buckets.pareja,
      cuatro: buckets.cuatro,
      rituales: buckets.ritual_individual,
      ritualesParaDos: buckets.ritual_dos,
      multiSession: buckets.multi
    };
  }, [giftItems]);

  const { items, add, remove, clear, totalCents } = useLocalCart();

  const handleAddToCart = (item: { name: string; priceCents: number; quantity?: number }) => {
    add(item);
    setOpenAccordionItems([]);
    setTimeout(() => setIsCartOpen(true), 0);
  };

  const handleCheckoutSuccess = useCallback(() => {
    clear();
  }, [clear]);

  const handleCustomGiftToggle = (groupKey: string) => {
    setCustomGiftDialogs(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const renderCustomGiftCard = (groupKey: string, title: string) => {
    const isOpen = customGiftDialogs[groupKey] || false;
    const customValue = customValues[groupKey] || "";
    
    const predefinedValues = [25, 50, 100, 200];
    
    const handleCustomValueChange = (value: string) => {
      setCustomValues(prev => ({
        ...prev,
        [groupKey]: value
      }));
    };
    
    const setDialogOpen = (open: boolean) => {
      setCustomGiftDialogs(prev => ({ ...prev, [groupKey]: open }));
    };
    
    const handleCustomAmountAdd = (amount: number) => {
      handleAddToCart({
        name: `${t('custom_gift_card')} - ${amount}€`,
        priceCents: amount * 100
      });
      setCustomGiftDialogs(prev => ({
        ...prev,
        [groupKey]: false
      }));
      // Limpiar el valor personalizado
      setCustomValues(prev => ({
        ...prev,
        [groupKey]: ""
      }));
    };
    
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-dashed border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t('custom_gift_card_title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('choose_amount_for')} {title.toLowerCase()}
          </p>
        </CardHeader>
        <CardFooter className="pt-0">
          <Dialog open={isOpen} onOpenChange={setDialogOpen}>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setDialogOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              {t('customize')}
            </Button>
            <DialogContent className="sm:max-w-md top-[10vh] translate-y-0">
              <ViewportSafeWrapper isOpen={isOpen} autoScroll={true} delay={100}>
                <DialogHeader>
                  <DialogTitle>{t('customize_gift_card_title')}</DialogTitle>
                  <DialogDescription>
                    {t('customize_gift_card_description_prefix')} {title.toLowerCase()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {predefinedValues.map((value) => (
                      <Button
                        key={value}
                        variant="outline"
                        onClick={() => handleCustomAmountAdd(value)}
                        className="h-12"
                      >
                        {value}€
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-amount">{t('other_value_label')}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom-amount"
                        type="number"
                        min="10"
                        max="500"
                        placeholder="75"
                        value={customValue}
                        onChange={(e) => handleCustomValueChange(e.target.value)}
                      />
                      <Button
                        onClick={() => {
                          const amount = parseInt(customValue);
                          if (amount >= 10 && amount <= 500) {
                            handleCustomAmountAdd(amount);
                          }
                        }}
                        disabled={!customValue || parseInt(customValue) < 10 || parseInt(customValue) > 500}
                      >
                        {t('add')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('value_min_max_note')}
                    </p>
                  </div>
                </div>
              </ViewportSafeWrapper>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    );
  };

  useEffect(() => {
    document.title = "Tarjetas Regalo | The Nook Madrid";
 
    const desc = "Tarjetas Regalo elegantes para todos los tratamientos en The Nook Madrid.";
    const ensureMeta = (name: string, content: string) => {
      let m = document.querySelector(`meta[name="${name}"]`);
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", name);
        document.head.appendChild(m);
      }
      m.setAttribute("content", content);
    };
    ensureMeta("description", desc);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", window.location.href);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
                <img
                  src="/lovable-uploads/475dc4d6-6d6b-4357-a8b5-4611869beb43.png"
                  alt="The Nook Madrid"
                  className="h-8 w-auto md:h-10"
                  loading="lazy"
                  width={160}
                  height={40}
                />
              </Link>
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
              >
                ← {t('back')}
              </Link>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Fixed cart button at top */}
      <div className="fixed top-20 right-4 z-50">
        <Button 
          variant="outline" 
          className="shadow-lg"
          onClick={() => setIsCartOpen(true)}
        >
          {t('cart')} ({items.length})
        </Button>
      </div>

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={(open) => {
        console.log("🔄 Dialog onOpenChange llamado:", open);
        setIsCartOpen(open);
      }}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          {/* Header fijo */}
          <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b bg-background">
            <DialogTitle>{t('your_cart')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('your_cart')}
            </DialogDescription>
          </DialogHeader>
          
          {/* Contenido scrolleable */}
          <div className="overflow-y-auto px-6 py-4" style={{ height: 'calc(90vh - 140px)' }}>
            <div className="space-y-4">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('cart_empty')}</p>
              ) : (
                <>
                  {/* Lista de productos */}
                  <div className="space-y-3">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                        <div>
                          <p className="text-sm font-medium leading-tight">{it.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {euro(it.priceCents)} × {it.quantity}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => remove(it.id)}>
                          {t('remove')}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('total')}</span>
                      <span className="font-semibold">{euro(totalCents)}</span>
                    </div>
                    {totalCents < 50 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                        <p className="text-xs text-destructive">
                          ⚠️ Mínimo requerido: €0.50. Faltan {euro(50 - totalCents)}.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Campos de comprador */}
                  <div className="space-y-3 border-t pt-3">
                    <div>
                      <Label htmlFor="purchased_by_name" className="text-sm">{t('purchased_by_name')}</Label>
                      <Input
                        id="purchased_by_name"
                        value={purchasedByName}
                        onChange={(e) => setPurchasedByName(e.target.value)}
                        placeholder={t('buyer_name_placeholder')}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="purchased_by_email" className="text-sm">{t('buyer_email')}</Label>
                      <Input
                        id="purchased_by_email"
                        type="email"
                        value={purchasedByEmail}
                        onChange={(e) => setPurchasedByEmail(e.target.value)}
                        placeholder={t('buyer_email_placeholder')}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  {/* Checkbox ¿Es un regalo? */}
                  <div className="border-t pt-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="is_gift" 
                        checked={isGift}
                        onCheckedChange={(checked) => setIsGift(!!checked)}
                      />
                      <Label htmlFor="is_gift" className="text-sm">{t('is_gift')}</Label>
                    </div>
                    
                    {isGift && (
                      <div className="space-y-3 mt-3 pl-6 border-l-2 border-primary/20">
                        <div>
                          <Label htmlFor="recipient_name" className="text-sm">{t('recipient_name_required')}</Label>
                          <Input
                            id="recipient_name"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder={t('recipient_name_placeholder')}
                            className="mt-1"
                            required={isGift}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="recipient_email" className="text-sm">{t('recipient_email')}</Label>
                          <Input
                            id="recipient_email"
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder={t('buyer_email_placeholder')}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="gift_message" className="text-sm">{t('gift_message')}</Label>
                          <Textarea
                            id="gift_message"
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value)}
                            placeholder={t('gift_message_placeholder')}
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Opciones de personalización */}
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-semibold">{t('gift_card_config')}</h4>
                    
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <Label htmlFor="show_price" className="text-sm">{t('show_price_on_card')}</Label>
                        <Checkbox 
                          id="show_price" 
                          checked={showPrice}
                          onCheckedChange={(checked) => setShowPrice(!!checked)}
                        />
                      </div>
                      
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <Label className="text-sm font-medium mb-3 block">{t('who_to_send_card')}</Label>
                        <div className="grid gap-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="send_to_buyer"
                              name="send_option"
                              checked={sendToBuyer}
                              onChange={() => setSendToBuyer(true)}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="send_to_buyer" className="text-sm">{t('send_to_buyer')}</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="send_to_recipient"
                              name="send_option"
                              checked={!sendToBuyer}
                              onChange={() => setSendToBuyer(false)}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="send_to_recipient" className="text-sm">{t('send_to_recipient')}</Label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <Label htmlFor="show_buyer_data" className="text-sm">{t('show_buyer_data')}</Label>
                        <Checkbox 
                          id="show_buyer_data" 
                          checked={showBuyerData}
                          onCheckedChange={(checked) => setShowBuyerData(!!checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <PaymentMethodsInfo />
                </>
              )}
            </div>
          </div>
          
          
          {/* Botones fijos en la parte inferior */}
          {items.length > 0 && (
            <div className="border-t px-6 py-4 bg-background">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={clear} className="h-12 text-sm">
                  {t('empty_cart_button')}
                </Button>
                <Button 
                  className="h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-sm font-semibold"
                  onClick={async () => {
                    console.log("🛒 Botón Comprar clickeado", {
                      purchasedByName,
                      purchasedByEmail,
                      isGift,
                      recipientName,
                      recipientEmail,
                      itemsCount: items.length,
                      totalCents
                    });

                    if (items.length === 0) return;
                    
                    // Validar monto mínimo de Stripe (€0.50)
                    if (totalCents < 50) {
                      toast.error(`El monto mínimo es €0.50. Por favor añade más productos.`);
                      return;
                    }
                    
                    if (isGift && !recipientName.trim()) {
                      toast.error(t('recipient_name_error'));
                      return;
                    }
                    if (!purchasedByName.trim()) {
                      toast.error(t('buyer_name_error'));
                      return;
                    }
                    if (!purchasedByEmail.trim()) {
                      toast.error(t('buyer_email_error'));
                      return;
                    }
                    
                    try {
                      console.log("📦 Creando checkout...");
                      const payload = {
                        intent: "gift_cards",
                        gift_cards: {
                          items: items.map(i => ({ 
                            amount_cents: i.priceCents, 
                            quantity: i.quantity,
                            name: i.name,
                            id: i.id,
                            purchased_by_name: purchasedByName.trim(),
                            purchased_by_email: purchasedByEmail.trim(),
                            is_gift: isGift,
                            ...(isGift && {
                              recipient_name: recipientName.trim(),
                              recipient_email: recipientEmail.trim(),
                            }),
                            gift_message: giftMessage.trim(),
                            show_price: showPrice,
                            show_buyer_data: showBuyerData,
                            send_to_buyer: sendToBuyer,
                          }))
                        }
                      };

                      const { data, error } = await supabase.functions.invoke('create-checkout', {
                        body: payload
                      });

                      console.log("✅ Respuesta create-checkout:", { data, error });

                      if (error) {
                        console.error("❌ Error en create-checkout:", error);
                        toast.error("Error en el checkout");
                        return;
                      }

                      if (data?.client_secret) {
                        if (typeof window !== "undefined") {
                          try {
                            sessionStorage.setItem("lastCheckoutIntent", "gift_cards");
                            sessionStorage.setItem(
                              "lastGiftCardSummary",
                              JSON.stringify(payload.gift_cards?.items || [])
                            );
                          } catch (storageError) {
                            console.warn("No se pudo guardar el resumen del checkout en sessionStorage", storageError);
                          }
                        }
                        console.log("💳 Abriendo modal de Stripe");
                        setStripeClientSecret(data.client_secret);
                        setStripeSessionId(data.session_id);
                        setShowStripeModal(true);
                        setIsCartOpen(false);
                      } else {
                        console.error("❌ No se recibió client_secret");
                        toast.error("Error en el checkout");
                      }
                    } catch (error) {
                      console.error("❌ Error:", error);
                      toast.error("Error en el checkout");
                    }
                  }}
                  disabled={!purchasedByName || !purchasedByEmail || (isGift && (!recipientName || !recipientEmail)) || totalCents < 50}
                >
                  {t('buy_button')} - {euro(totalCents)}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <article>
          <header className="mb-5">
            <div>
              <h1 className="text-2xl font-bold">{t('gift_cards_page')}</h1>
            </div>
          </header>

          {/* Modal de Stripe Checkout */}
          <Dialog open={showStripeModal} onOpenChange={setShowStripeModal}>
            <DialogContent className="max-w-[520px] top-[5vh] translate-y-0 max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b bg-background">
                <DialogTitle>{t('complete_payment')}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto min-h-0">
                {stripeClientSecret && (
                  <StripeCheckoutModal 
                    clientSecret={stripeClientSecret}
                    sessionId={stripeSessionId}
                    onClose={() => setShowStripeModal(false)}
                    onSuccess={handleCheckoutSuccess}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          <section className="grid gap-6">
            <Accordion
              type="multiple"
              value={openAccordionItems}
              onValueChange={(value) =>
                setOpenAccordionItems(Array.isArray(value) ? value : [value])
              }
              className="space-y-4"
            >
              {groups.individuales.length > 0 && (
                <AccordionItem value="tarjetas-individuales" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">{t('gift_card_group_individual')}</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {renderCustomGiftCard('individuales', t('individual_massages'))}
                        {groups.individuales.map((item) => (
                          <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                             <OptimizedImage
                               src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                               alt={translatePackageName(item.name)}
                               className="aspect-[4/3]"
                               width={GIFT_IMAGE_PROPS.width}
                               height={GIFT_IMAGE_PROPS.height}
                               quality={GIFT_IMAGE_PROPS.quality}
                             />
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base leading-tight">{translatePackageName(item.name)}</CardTitle>
                              <p className="text-sm text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                            </CardHeader>
                              <CardContent className="pb-2">
                                <p className="text-2xl font-bold text-primary">{euro(item.priceCents!)}</p>
                              </CardContent>
                              <CardFooter className="pt-2">
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() =>
                                    handleAddToCart({
                                      name: translatePackageName(item.name),
                                      priceCents: item.priceCents!
                                    })
                                  }
                                >
                                  {t('add_to_cart')}
                                </Button>
                              </CardFooter>
                         </Card>
                       ))}
                    </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="tarjetas-multisesion" className="border rounded-lg">
            <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
              <h2 className="text-lg font-semibold">{t('gift_card_group_multi_sessions')}</h2>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {groups.multiSession.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay tarjetas en este grupo todavía.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {groups.multiSession.map((item: any) => (
                    <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                      <OptimizedImage
                        src={item.imageUrl || DEFAULT_GIFT_IMAGE}
                        alt={translatePackageName(item.name)}
                        className="aspect-[4/3]"
                        width={GIFT_IMAGE_PROPS.width}
                        height={GIFT_IMAGE_PROPS.height}
                        quality={GIFT_IMAGE_PROPS.quality}
                      />
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base leading-tight">{translatePackageName(item.name)}</CardTitle>
                        <p className="text-sm text-muted-foreground uppercase tracking-wide">
                          {t('gift_cards').toUpperCase()}
                        </p>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-2xl font-bold text-primary">{euro(item.priceCents!)}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('sessions')}: {(item as any).sessionsCount || 0}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            handleAddToCart({
                              name: translatePackageName(item.name),
                              priceCents: item.priceCents!
                            })
                          }
                        >
                          {t('add_to_cart')}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {groups.paraDos.length > 0 && (
            <AccordionItem value="tarjetas-dos-personas" className="border rounded-lg">
              <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                 <h2 className="text-lg font-semibold">{t('gift_card_group_couples')}</h2>
                   </AccordionTrigger>
                   <AccordionContent className="px-4 pb-4">
                     <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {renderCustomGiftCard('paraDos', t('couples_massages'))}
                         {groups.paraDos.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                              <OptimizedImage
                                src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                                alt={translatePackageName(item.name)}
                                className="aspect-[4/3]"
                                width={GIFT_IMAGE_PROPS.width}
                                height={GIFT_IMAGE_PROPS.height}
                                quality={GIFT_IMAGE_PROPS.quality}
                              />
                             <CardHeader className="pb-2">
                               <CardTitle className="text-base leading-tight">{translatePackageName(item.name)}</CardTitle>
                               <p className="text-sm text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                             </CardHeader>
                              <CardContent className="pb-2">
                                <p className="text-2xl font-bold text-primary">{euro(item.priceCents!)}</p>
                              </CardContent>
                              <CardFooter className="pt-2">
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() =>
                                    handleAddToCart({
                                      name: translatePackageName(item.name),
                                      priceCents: item.priceCents!
                                    })
                                  }
                                >
                                  {t('add_to_cart')}
                                </Button>
                             </CardFooter>
                         </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {groups.cuatro.length > 0 && (
                <AccordionItem value="tarjetas-cuatro-manos" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                     <h2 className="text-lg font-semibold">{t('gift_card_group_four_hands')}</h2>
                   </AccordionTrigger>
                   <AccordionContent className="px-4 pb-4">
                     <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {renderCustomGiftCard('cuatro', t('four_hands_massages'))}
                         {groups.cuatro.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                              <OptimizedImage
                                src={item.imageUrl || DEFAULT_GIFT_IMAGE}
                                alt={translatePackageName(item.name)}
                                className="aspect-[4/3]"
                                width={GIFT_IMAGE_PROPS.width}
                                height={GIFT_IMAGE_PROPS.height}
                                quality={GIFT_IMAGE_PROPS.quality}
                              />
                             <CardHeader className="pb-2">
                               <CardTitle className="text-base leading-tight">{translatePackageName(item.name)}</CardTitle>
                               <p className="text-sm text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                             </CardHeader>
                              <CardContent className="pb-2">
                                <p className="text-2xl font-bold text-primary">{euro(item.priceCents!)}</p>
                              </CardContent>
                              <CardFooter className="pt-2">
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() =>
                                    handleAddToCart({
                                      name: translatePackageName(item.name),
                                      priceCents: item.priceCents!
                                    })
                                  }
                                >
                                  {t('add_to_cart')}
                                </Button>
                             </CardFooter>
                         </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {groups.rituales.length > 0 && (
                <AccordionItem value="tarjetas-rituales" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                     <h2 className="text-lg font-semibold">{t('gift_card_group_individual_rituals')}</h2>
                   </AccordionTrigger>
                   <AccordionContent className="px-4 pb-4">
                     <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {renderCustomGiftCard('rituales', t('rituals'))}
                         {groups.rituales.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200 max-w-sm">
                              <OptimizedImage
                                src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                                alt={translatePackageName(item.name)}
                                className="aspect-[4/3]"
                                width={GIFT_IMAGE_PROPS.width}
                                height={GIFT_IMAGE_PROPS.height}
                                quality={GIFT_IMAGE_PROPS.quality}
                              />
                             <CardHeader className="pb-2 p-3">
                               <CardTitle className="text-sm leading-tight">{translatePackageName(item.name)}</CardTitle>
                               <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                             </CardHeader>
                              <CardContent className="pb-2 p-3 pt-0">
                                <p className="text-lg font-bold text-primary">{euro(item.priceCents!)}</p>
                              </CardContent>
                              <CardFooter className="pt-2 p-3">
                                <Button
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() =>
                                    handleAddToCart({
                                      name: translatePackageName(item.name),
                                      priceCents: item.priceCents!
                                    })
                                  }
                                >
                                  {t('add_to_cart')}
                                </Button>
                              </CardFooter>
                          </Card>
                       ))}
                    </div>
                  </AccordionContent>
                 </AccordionItem>
               )}

              {groups.ritualesParaDos.length > 0 && (
                <AccordionItem value="tarjetas-rituales-dos" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                     <h2 className="text-lg font-semibold">{t('gift_card_group_couples_rituals')}</h2>
                   </AccordionTrigger>
                   <AccordionContent className="px-4 pb-4">
                     <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                          {renderCustomGiftCard('ritualesParaDos', t('gift_card_group_couples_rituals'))}
                          {groups.ritualesParaDos.map((item) => (
                            <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200 max-w-sm">
                               <OptimizedImage
                                 src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                                 alt={translatePackageName(item.name)}
                                 className="aspect-[4/3]"
                                 width={GIFT_IMAGE_PROPS.width}
                                 height={GIFT_IMAGE_PROPS.height}
                                 quality={GIFT_IMAGE_PROPS.quality}
                               />
                              <CardHeader className="pb-2 p-3">
                                <CardTitle className="text-sm leading-tight">{translatePackageName(item.name)}</CardTitle>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                              </CardHeader>
                               <CardContent className="pb-2 p-3 pt-0">
                                 <p className="text-lg font-bold text-primary">{euro(item.priceCents!)}</p>
                               </CardContent>
                               <CardFooter className="pt-2 p-3">
                                 <Button
                                   size="sm"
                                   className="w-full text-xs"
                                   onClick={() =>
                                     handleAddToCart({
                                       name: translatePackageName(item.name),
                                       priceCents: item.priceCents!
                                     })
                                   }
                                 >
                                   {t('add_to_cart')}
                                 </Button>
                               </CardFooter>
                           </Card>
                        ))}
                     </div>
                   </AccordionContent>
                 </AccordionItem>
               )}

             </Accordion>
          </section>
        </article>
      </main>
    </div>
  );
};

export default GiftCardsPage;
