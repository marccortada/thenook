import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
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

  const { items, add, remove, clear, totalCents } = useLocalCart();

  // Función para traducir nombres de paquetes/tarjetas - DEBE estar antes de useMemo
  const translatePackageName = useCallback((name: string) => {
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
    const mapping = translationMap[normalizedKey];
    if (mapping && mapping['es']) {
      return mapping['es'];
    }
    
    // Si no hay traducción, devolver nombre limpio
    return cleanName;
  }, [t]);

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

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <article>
          <header className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t('gift_cards_page')}</h1>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsCartOpen(true)}
            >
              {t('cart')} ({items.length})
            </Button>
          </header>

          {/* Modal de Stripe para el pago */}
          <Dialog open={showStripeModal} onOpenChange={setShowStripeModal}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Completar compra</DialogTitle>
                <DialogDescription>
                  Complete el pago con Stripe de forma segura
                </DialogDescription>
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
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xl font-bold text-primary">{euro(item.priceCents!)}</p>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="px-4"
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
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
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
                               <div className="flex items-center justify-between gap-2">
                                 <p className="text-lg font-bold text-primary">{euro(item.priceCents!)}</p>
                                 <Button
                                   size="sm"
                                   variant="default"
                                   className="px-3 text-xs"
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
                                  variant="outline"
                                  className="w-full text-xs"
                                  onClick={() => {
                                    add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
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
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-lg font-bold text-primary">{euro(item.priceCents!)}</p>
                              <Button
                                size="sm"
                                variant="default"
                                className="px-3 text-xs"
                                onClick={() => {
                                  add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                  setIsCartOpen(true);
                                }}
                              >
                                {t('buy_button')}
                              </Button>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2 p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs"
                              onClick={() => {
                                add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
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
                    <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-5">
                      {groups.rituales.map((item) => (
                        <Card key={item.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200 max-w-xs">
                          <OptimizedImage
                            src={item.imageUrl || '/lovable-uploads/93fd7781-d4ed-4ae8-ab36-5397b4b80598.png'}
                            alt={translatePackageName(item.name)}
                            className="aspect-[4/3]"
                            width={300}
                            height={225}
                            quality={80}
                          />
                          <CardHeader className="pb-2 p-3">
                            <CardTitle className="text-xs leading-tight">{translatePackageName(item.name)}</CardTitle>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('gift_cards').toUpperCase()}</p>
                          </CardHeader>
                          <CardContent className="pb-2 p-3 pt-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-sm font-bold text-primary">{euro(item.priceCents!)}</p>
                              <Button
                                size="sm"
                                variant="default"
                                className="px-2 text-xs h-8"
                                onClick={() => {
                                  add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
                                  setIsCartOpen(true);
                                }}
                              >
                                {t('buy_button')}
                              </Button>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2 p-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs h-8"
                              onClick={() => {
                                add({ name: translatePackageName(item.name), priceCents: item.priceCents! });
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

      {/* Drawer del carrito que se abre desde abajo */}
      <Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-center">
            <DrawerTitle>{t('your_cart')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('cart_empty')}</p>
            ) : (
              <div className="space-y-4">
                {/* Lista de productos */}
                <div className="space-y-3 max-h-40 overflow-y-auto">
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
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Mostrar precio en la tarjeta</p>
                        <p className="text-xs text-muted-foreground">El precio aparecerá visible en la tarjeta regalo</p>
                      </div>
                      <Switch 
                        checked={showPrice} 
                        onCheckedChange={setShowPrice}
                      />
                    </div>
                    
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium">Enviar tarjeta a:</p>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="send_to_buyer"
                            name="send_to"
                            checked={sendToBuyer}
                            onChange={() => setSendToBuyer(true)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="send_to_buyer" className="text-sm">{t('send_to_buyer')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="send_to_recipient"
                            name="send_to"
                            checked={!sendToBuyer}
                            onChange={() => setSendToBuyer(false)}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="send_to_recipient" className="text-sm">{t('send_to_recipient')}</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Mostrar datos del comprador</p>
                        <p className="text-xs text-muted-foreground">Los datos del comprador aparecerán en la tarjeta</p>
                      </div>
                      <Switch 
                        checked={showBuyerData} 
                        onCheckedChange={setShowBuyerData}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Botones de acción */}
                <div className="border-t pt-4 space-y-3">
                  <div className="grid gap-2">
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={async () => {
                        // Validación de campos requeridos
                        if (!purchasedByName.trim() || !purchasedByEmail.trim()) {
                          toast.error("Por favor, complete los datos del comprador");
                          return;
                        }
                        
                        if (isGift && !recipientName.trim()) {
                          toast.error("Por favor, complete el nombre del destinatario");
                          return;
                        }

                        // Mapeo de elementos del carrito a formato requerido
                        const lineItems = items.map(item => ({
                          name: item.name,
                          price_cents: item.priceCents,
                          quantity: item.quantity,
                          type: 'gift_card'
                        }));

                        try {
                          const { data, error } = await supabase.functions.invoke('create-checkout', {
                            body: {
                              line_items: lineItems,
                              gift_card_options: {
                                show_price: showPrice,
                                send_to_buyer: sendToBuyer,
                                show_buyer_data: showBuyerData,
                                is_gift: isGift,
                                recipient_name: isGift ? recipientName : '',
                                recipient_email: isGift ? recipientEmail : '',
                                gift_message: isGift ? giftMessage : '',
                                purchased_by_name: purchasedByName,
                                purchased_by_email: purchasedByEmail
                              }
                            }
                          });

                          if (error) throw error;

                          if (data?.url) {
                            window.location.href = data.url;
                          } else if (data?.client_secret) {
                            setStripeClientSecret(data.client_secret);
                            setShowStripeModal(true);
                            setIsCartOpen(false);
                          }
                        } catch (error) {
                          console.error("Error creating checkout:", error);
                          toast.error("Error en el pago. Intente nuevamente.");
                        }
                      }}
                    >
                      {t('proceed_to_payment')}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={clear}
                      size="sm"
                    >
                      Vaciar carrito
                    </Button>
                  </div>
                  <PaymentMethodsInfo />
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default GiftCardsPage;