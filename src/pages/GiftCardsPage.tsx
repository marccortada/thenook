import { useEffect, useMemo, useState } from "react";
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
import { useTranslation } from "@/hooks/useTranslation";

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
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  
  const { t } = useTranslation();

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

    // Intentar usar el sistema de traducciones primero, con fallback al mapeo directo
    try {
      const translation = t(normalizedKey as any);
      if (translation !== normalizedKey) {
        return translation;
      }
    } catch (error) {
      console.warn('Translation system error, using fallback');
    }
    
    // Usar idioma por defecto sin llamar useTranslation nuevamente
    const currentLang = 'es'; // default language
    const mapping = translationMap[normalizedKey];
    if (mapping && mapping[currentLang]) {
      return mapping[currentLang];
    }
    
    // Si no hay traducción, devolver nombre limpio
    return cleanName;
  };

  // Hook para manejo del carrito local
  const useLocalCart = () => {
    const [items, setItems] = useState<CartItem[]>(() => {
      try {
        const raw = localStorage.getItem("cart:giftcards");
        return raw ? (JSON.parse(raw) as CartItem[]) : [];
      } catch {
        return [];
      }
    });
    useEffect(() => {
      localStorage.setItem("cart:giftcards", JSON.stringify(items));
    }, [items]);

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
      toast.success(t('added_to_cart'));
    };

    const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
    const clear = () => setItems([]);
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
  const giftItems: GiftCardItem[] = useMemo(() => {
    return (giftOptions || []).map((option: any) => ({
      id: option.id,
      name: option.name,
      type: 'fixed' as GiftType,
      priceCents: option.amount_cents,
      description: option.description,
      imageUrl: option.image_url || '/lovable-uploads/a67f856f-f685-4134-9b22-730c400d6266.png'
    }));
  }, [giftOptions]);

  const groups = useMemo(() => {
    const individuales = giftItems.filter((i) => i.type === "fixed" && !isCuatroManos(i.name) && !isRitual(i.name) && !isDuo(i.name));
    const cuatro = giftItems.filter((i) => i.type === "fixed" && isCuatroManos(i.name));
    const rituales = giftItems.filter((i) => i.type === "fixed" && isRitual(i.name) && !isDuo(i.name));
    const ritualesParaDos = giftItems.filter((i) => i.type === "fixed" && isRitual(i.name) && isDuo(i.name));
    const paraDos = giftItems.filter((i) => i.type === "fixed" && isDuo(i.name) && !isRitual(i.name));
    return { individuales, cuatro, rituales, ritualesParaDos, paraDos };
  }, [giftItems]);

  const { items, add, remove, clear, totalCents } = useLocalCart();

  const handleCustomGiftToggle = (groupKey: string) => {
    setCustomGiftDialogs(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleCustomAmountAdd = (groupKey: string, amount: number) => {
    add({
      name: `Tarjeta Regalo Personalizada - ${amount}€`,
      priceCents: amount * 100
    });
    setCustomGiftDialogs(prev => ({
      ...prev,
      [groupKey]: false
    }));
  };

  const renderCustomGiftCard = (groupKey: string, title: string) => {
    const isOpen = customGiftDialogs[groupKey] || false;
    const [customValue, setCustomValue] = useState("");
    
    const predefinedValues = [25, 50, 100, 200];
    
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-dashed border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Tarjeta Regalo Personalizada
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Elige el valor que prefieras para {title.toLowerCase()}
          </p>
        </CardHeader>
        <CardFooter className="pt-0">
          <Dialog open={isOpen} onOpenChange={(open) => handleCustomGiftToggle(groupKey)}>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleCustomGiftToggle(groupKey)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Personalizar
            </Button>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Personalizar Tarjeta Regalo</DialogTitle>
                <DialogDescription>
                  Selecciona el valor de tu tarjeta regalo para {title.toLowerCase()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {predefinedValues.map((value) => (
                    <Button
                      key={value}
                      variant="outline"
                      onClick={() => handleCustomAmountAdd(groupKey, value)}
                      className="h-12"
                    >
                      {value}€
                    </Button>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-amount">Otro valor (€)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-amount"
                      type="number"
                      min="10"
                      max="500"
                      placeholder="Ej: 75"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        const amount = parseInt(customValue);
                        if (amount >= 10 && amount <= 500) {
                          handleCustomAmountAdd(groupKey, amount);
                          setCustomValue("");
                        }
                      }}
                      disabled={!customValue || parseInt(customValue) < 10 || parseInt(customValue) > 500}
                    >
                      Añadir
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor mínimo: 10€ - Valor máximo: 500€
                  </p>
                </div>
              </div>
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
          <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-background">
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
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">{t('total')}</span>
                    <span className="font-semibold">{euro(totalCents)}</span>
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
                    if (items.length === 0) return;
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
                      const payload = {
                        intent: "gift_cards",
                        gift_cards: {
                          items: items.map(i => ({ 
                            amount_cents: i.priceCents, 
                            quantity: i.quantity,
                            name: i.name,
                            id: i.id
                          })),
                          purchased_by: {
                            name: purchasedByName.trim(),
                            email: purchasedByEmail.trim(),
                          },
                          ...(isGift && {
                            recipient: {
                              name: recipientName.trim(),
                              email: recipientEmail.trim(),
                            }
                          }),
                          options: {
                            is_gift: isGift,
                            gift_message: giftMessage.trim(),
                            show_price_on_card: showPrice,
                            show_buyer_data: showBuyerData,
                            send_to_buyer: sendToBuyer,
                          }
                        }
                      };

                      const { data, error } = await supabase.functions.invoke('create-checkout', {
                        body: payload
                      });

                      if (error) {
                        console.error("❌ Error en create-checkout:", error);
                        toast.error("Error en el checkout");
                        return;
                      }

                      if (data?.client_secret) {
                        setStripeClientSecret(data.client_secret);
                        setStripeSessionId(data.session_id);
                        setShowStripeModal(true);
                        setIsCartOpen(false);
                      } else {
                        toast.error("Error en el checkout");
                      }
                    } catch (error) {
                      console.error("❌ Error:", error);
                      toast.error("Error en el checkout");
                    }
                  }}
                  disabled={!purchasedByName || !purchasedByEmail || (isGift && (!recipientName || !recipientEmail))}
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('complete_payment')}</DialogTitle>
                <DialogDescription>{t('secure_payment_info')}</DialogDescription>
              </DialogHeader>
              {stripeClientSecret && (
                <StripeCheckoutModal 
                  clientSecret={stripeClientSecret}
                  sessionId={stripeSessionId}
                  onClose={() => setShowStripeModal(false)}
                />
              )}
            </DialogContent>
          </Dialog>

          <section className="grid gap-6">
            <Accordion type="multiple" defaultValue={[]} className="space-y-4">
              {groups.individuales.length > 0 && (
                <AccordionItem value="tarjetas-individuales" className="border rounded-lg p-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                     <h2 className="text-lg font-semibold">{t('individual_massages_packages')}</h2>
                   </AccordionTrigger>
                   <AccordionContent className="px-4 pb-4">
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {renderCustomGiftCard('individuales', 'Masajes Individuales')}
                        {groups.individuales.map((item) => (
                          <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                             <OptimizedImage
                               src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                               alt={translatePackageName(item.name)}
                               className="aspect-[4/3]"
                               width={400}
                               height={300}
                               quality={80}
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
                                 onClick={() => {
                                   console.log("🛒 Botón Añadir al Carrito clickeado - Individual");
                                   console.log("Estado actual isCartOpen:", isCartOpen);
                                   add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                   console.log("Producto añadido, ahora abriendo carrito...");
                                   setIsCartOpen(true);
                                   console.log("setIsCartOpen(true) llamado - debería abrir el modal");
                                 }}
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

              {groups.paraDos.length > 0 && (
                <AccordionItem value="tarjetas-dos-personas" className="border rounded-lg p-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                     <h2 className="text-lg font-semibold">{t('couples_packages')}</h2>
                   </AccordionTrigger>
                   <AccordionContent className="px-4 pb-4">
                     <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                         {renderCustomGiftCard('paraDos', 'Masajes para Dos Personas')}
                         {groups.paraDos.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                              <OptimizedImage
                                src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                                alt={translatePackageName(item.name)}
                                className="aspect-[4/3]"
                                width={400}
                                height={300}
                                quality={80}
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
                                  onClick={() => {
                                    add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                    setIsCartOpen(true);
                                  }}
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
                <AccordionItem value="tarjetas-cuatro-manos" className="border rounded-lg p-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                     <h2 className="text-lg font-semibold">{t('four_hands_packages')}</h2>
                   </AccordionTrigger>
                   <AccordionContent className="px-4 pb-4">
                     <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                         {renderCustomGiftCard('cuatro', 'Masajes a Cuatro Manos')}
                         {groups.cuatro.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                              <OptimizedImage
                                src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                                alt={translatePackageName(item.name)}
                                className="aspect-[4/3]"
                                width={400}
                                height={300}
                                quality={80}
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
                                  onClick={() => {
                                    add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                    setIsCartOpen(true);
                                  }}
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
                <AccordionItem value="tarjetas-rituales" className="border rounded-lg p-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                     <h2 className="text-lg font-semibold">{t('rituals_packages')}</h2>
                   </AccordionTrigger>
                   <AccordionContent className="px-4 pb-4">
                     <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                         {renderCustomGiftCard('rituales', 'Rituales Individuales')}
                         {groups.rituales.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200 max-w-sm">
                              <OptimizedImage
                                src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                                alt={translatePackageName(item.name)}
                                className="aspect-[4/3]"
                                width={400}
                                height={300}
                                quality={80}
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
                                  onClick={() => {
                                    add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                    setIsCartOpen(true);
                                  }}
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
                 <AccordionItem value="tarjetas-rituales-dos" className="border rounded-lg p-0">
                   <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <h2 className="text-lg font-semibold">Tarjetas para Rituales para Dos</h2>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                          {renderCustomGiftCard('ritualesParaDos', 'Rituales para Dos Personas')}
                          {groups.ritualesParaDos.map((item) => (
                            <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200 max-w-sm">
                               <OptimizedImage
                                 src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                                 alt={translatePackageName(item.name)}
                                 className="aspect-[4/3]"
                                 width={400}
                                 height={300}
                                 quality={80}
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
                                   onClick={() => {
                                     add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                     setIsCartOpen(true);
                                   }}
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
