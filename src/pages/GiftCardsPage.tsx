import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
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
  
  const { t } = useTranslation();

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
    
    // Fallback: usar mapeo directo
    const { language } = useTranslation();
    const mapping = translationMap[normalizedKey];
    if (mapping && mapping[language]) {
      return mapping[language];
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
    const rituales = giftItems.filter((i) => i.type === "fixed" && isRitual(i.name));
    const paraDos = giftItems.filter((i) => i.type === "fixed" && isDuo(i.name));
    return { individuales, cuatro, rituales, paraDos };
  }, [giftItems]);

  const { items, add, remove, clear, totalCents } = useLocalCart();
  const [customAmount, setCustomAmount] = useState<number | "">("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const presets = [25, 50, 100, 200];

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

  const addCustomToCart = () => {
    const amount = selectedPreset ?? (typeof customAmount === "number" ? customAmount : NaN);
    if (!amount || amount <= 0) {
      toast.error(t('valid_amount'));
      return;
    }
    add({ name: t('custom_gift_card'), priceCents: Math.round(amount * 100) });
  };

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

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <article>
          <header className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t('gift_cards_page')}</h1>
            </div>
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">{t('cart')} ({items.length})</Button>
              </SheetTrigger>
              <SheetContent className="w-[90vw] sm:w-[480px] flex flex-col max-h-[100vh]">
                <SheetHeader className="flex-shrink-0 pb-4">
                  <SheetTitle>{t('your_cart')}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
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
                  
                  {/* Botones fijos en la parte inferior */}
                  {items.length > 0 && (
                    <div className="flex-shrink-0 border-t pt-4 mt-4 bg-background">
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <Button variant="secondary" onClick={clear} className="h-14 text-sm">
                          {t('empty_cart_button')}
                        </Button>
                        <Button 
                          className="h-14 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-sm font-semibold"
                          onClick={async () => {
                            console.log("=== INICIANDO PROCESO DE PAGO ===");
                            console.log("Items en carrito:", items.length);
                            console.log("Es regalo:", isGift);
                            console.log("Nombre comprador:", purchasedByName);
                            console.log("Email comprador:", purchasedByEmail);
                            
                            if (items.length === 0) {
                              console.log("❌ Carrito vacío");
                              return;
                            }
                            
                            if (isGift && !recipientName.trim()) {
                              console.log("❌ Falta nombre del beneficiario");
                              toast.error(t('recipient_name_error'));
                              return;
                            }
                            
                            try {
                              if (!purchasedByName.trim()) {
                                console.log("❌ Falta nombre del comprador");
                                toast.error(t('buyer_name_error'));
                                return;
                              }
                              if (!purchasedByEmail.trim()) {
                                console.log("❌ Falta email del comprador");
                                toast.error(t('buyer_email_error'));
                                return;
                              }
                              
                              console.log("✅ Validaciones pasadas, creando payload...");
                              
                              const payload = {
                                intent: "gift_cards",
                                gift_cards: {
                                  items: items.map(i => ({ 
                                    amount_cents: i.priceCents, 
                                    quantity: i.quantity,
                                    name: i.name,
                                    purchased_by_name: purchasedByName,
                                    purchased_by_email: purchasedByEmail,
                                    is_gift: isGift,
                                    recipient_name: isGift ? recipientName : undefined,
                                    recipient_email: isGift ? recipientEmail : undefined,
                                    gift_message: isGift ? giftMessage : undefined,
                                    show_price: showPrice,
                                    send_to_buyer: sendToBuyer,
                                    show_buyer_data: showBuyerData
                                  })),
                                  total_cents: totalCents
                                },
                                currency: "eur"
                              };
                              
                              console.log("📦 Payload creado:", payload);
                              console.log("🚀 Llamando a create-checkout...");
                              
                              const { data, error } = await supabase.functions.invoke("create-checkout", { body: payload });
                              
                              console.log("📥 Respuesta recibida:");
                              console.log("Data:", data);
                              console.log("Error:", error);
                              
                              if (error) {
                                console.log("❌ Error en la función:", error);
                                throw error;
                              }
                              
                              if (data?.client_secret) {
                                console.log("✅ Client secret recibido, abriendo modal...");
                                setStripeClientSecret(data.client_secret);
                                setShowStripeModal(true);
                              } else {
                                console.log("❌ No se recibió client_secret");
                                toast.error("No se recibió configuración de pago");
                              }
                            } catch (e: any) {
                              console.log("💥 Error capturado:", e);
                              toast.error(e.message || t('payment_init_error'));
                            }
                          }}
                        >
                          {t('buy_button')} - {euro(totalCents)}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
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
                        {groups.individuales.map((item) => (
                          <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                            <div className="aspect-[4/3] overflow-hidden">
                              <img 
                                src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'} 
                                alt={translatePackageName(item.name)}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base leading-tight">{translatePackageName(item.name)}</CardTitle>
                              <p className="text-sm text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <div className="flex items-center justify-between">
                                <p className="text-2xl font-bold text-primary">{euro(item.priceCents!)}</p>
                                <Button
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                                  onClick={() => {
                                    add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                    setIsCartOpen(true);
                                  }}
                                 >
                                   {t('buy_button')}
                                 </Button>
                              </div>
                            </CardContent>
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
                         {groups.paraDos.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                             <div className="aspect-[4/3] overflow-hidden">
                               <img 
                                 src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'} 
                                 alt={translatePackageName(item.name)}
                                 className="w-full h-full object-cover"
                               />
                             </div>
                             <CardHeader className="pb-2">
                               <CardTitle className="text-base leading-tight">{translatePackageName(item.name)}</CardTitle>
                               <p className="text-sm text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                             </CardHeader>
                             <CardContent className="pb-2">
                               <div className="flex items-center justify-between">
                                 <p className="text-2xl font-bold text-primary">{euro(item.priceCents!)}</p>
                                 <Button
                                   size="sm"
                                   className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                                   onClick={() => {
                                     add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                     setIsCartOpen(true);
                                   }}
                                 >
                                   {t('buy_button')}
                                 </Button>
                               </div>
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
                         {groups.cuatro.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                             <div className="aspect-[4/3] overflow-hidden">
                               <img 
                                 src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'} 
                                 alt={translatePackageName(item.name)}
                                 className="w-full h-full object-cover"
                               />
                             </div>
                             <CardHeader className="pb-2">
                               <CardTitle className="text-base leading-tight">{translatePackageName(item.name)}</CardTitle>
                               <p className="text-sm text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                             </CardHeader>
                             <CardContent className="pb-2">
                               <div className="flex items-center justify-between">
                                 <p className="text-2xl font-bold text-primary">{euro(item.priceCents!)}</p>
                                 <Button
                                   size="sm"
                                   className="bg-blue-500 hover:bg-blue-600 text-white px-6"
                                   onClick={() => {
                                     add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                     setIsCartOpen(true);
                                   }}
                                 >
                                   {t('buy_button')}
                                 </Button>
                               </div>
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
                         {groups.rituales.map((item) => (
                           <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200 max-w-sm">
                             <div className="aspect-[4/3] overflow-hidden">
                               <img 
                                 src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'} 
                                 alt={translatePackageName(item.name)}
                                 className="w-full h-full object-cover"
                               />
                             </div>
                             <CardHeader className="pb-2 p-3">
                               <CardTitle className="text-sm leading-tight">{translatePackageName(item.name)}</CardTitle>
                               <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                             </CardHeader>
                             <CardContent className="pb-2 p-3 pt-0">
                               <div className="flex items-center justify-between">
                                 <p className="text-lg font-bold text-primary">{euro(item.priceCents!)}</p>
                                <Button
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 text-xs"
                                  onClick={() => {
                                    add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                    setIsCartOpen(true);
                                  }}
                                 >
                                    {t('buy_button')}
                                  </Button>
                               </div>
                             </CardContent>
                          </Card>
                       ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Custom Amount */}
              <AccordionItem value="importe-personalizado" className="border rounded-lg p-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                   <h2 className="text-lg font-semibold">{t('custom_amount')}</h2>
                 </AccordionTrigger>
                 <AccordionContent className="px-4 pb-4">
                   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                     <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                       <CardHeader className="pb-2">
                         <CardTitle className="text-base leading-tight">{t('custom_gift_card')}</CardTitle>
                       </CardHeader>
                       <CardContent className="pb-2">
                         <div className="space-y-3">
                           <p className="text-sm text-muted-foreground">{t('custom_description')}</p>
                           <div className="flex flex-wrap gap-2">
                             {presets.map((p) => (
                               <Button
                                 key={p}
                                 variant={selectedPreset === p ? "default" : "outline"}
                                 size="sm"
                                 onClick={() => setSelectedPreset((prev) => (prev === p ? null : p))}
                               >
                                 {euro(p * 100)}
                               </Button>
                             ))}
                           </div>
                           <div className="flex items-center gap-2">
                             <Input
                               type="number"
                               inputMode="numeric"
                               min={1}
                               step={1}
                               value={customAmount === "" ? "" : customAmount}
                               onChange={(e) => {
                                 const v = e.target.value;
                                 if (v === "") {
                                   setCustomAmount("");
                                   return;
                                 }
                                 const n = Number(v);
                                 if (!Number.isNaN(n)) setCustomAmount(n);
                               }}
                               placeholder={t('custom_placeholder')}
                               className="h-9"
                             />
                             <Button size="sm" onClick={addCustomToCart}>
                               {t('add_to_cart')}
                             </Button>
                           </div>
                         </div>
                       </CardContent>
                       <CardFooter className="pt-2">
                         <Button
                           size="sm"
                           className="w-full"
                           onClick={addCustomToCart}
                         >
                           {t('add_to_cart')}
                         </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </article>
      </main>
    </div>
  );
};

export default GiftCardsPage;
