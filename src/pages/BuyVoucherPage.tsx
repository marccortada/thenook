import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePackages } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { Gift } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PaymentMethodsInfo } from "@/components/PaymentMethodsInfo";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

const currency = (cents?: number) =>
  typeof cents === "number" ? (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "";

interface CartItem {
  id: string;
  name: string;
  priceCents: number;
  packageId: string;
  sessionsCount: number;
}

// Simple local cart
const useLocalCart = (t: (key: string) => string) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (item: Omit<CartItem, "id">) => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), ...item }]);
    toast.success(t('added_to_cart'));
  };

  const remove = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const clear = () => setItems([]);
  const totalCents = useMemo(() => items.reduce((sum, i) => sum + i.priceCents, 0), [items]);

  return { items, add, remove, clear, totalCents };
};

export default function BuyVoucherPage() {
  const { packages } = usePackages();
  const { t } = useTranslation();
  const { items, add, remove, clear, totalCents } = useLocalCart(t);
  
  // Campos del formulario
  const [purchasedByName, setPurchasedByName] = useState("");
  const [purchasedByEmail, setPurchasedByEmail] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  const isDuo = (name?: string) => {
    const txt = (name || "").toLowerCase();
    return /(dos|pareja|parejas|dúo|duo)/.test(txt) || /\b2\s*personas?\b/.test(txt) || /para\s*2\s*personas?/.test(txt) || /\b(2p|2\s*pax)\b/.test(txt);
  };
  const isCuatroManos = (name?: string) => !!name?.toLowerCase().includes("cuatro manos");
  const isRitual = (name?: string, description?: string) => {
    const txt = `${name || ""} ${description || ""}`.toLowerCase();
    return txt.includes("ritual");
  };

  const categorized = useMemo(() => {
    // Deduplicar por nombre manteniendo el menor precio
    const pmap = new Map<string, any>();
    for (const p of packages as any[]) {
      const key = (p?.name || "").trim().toLowerCase();
      const existing = pmap.get(key);
      const price = typeof p?.price_cents === 'number' ? p.price_cents : Number.MAX_SAFE_INTEGER;
      const existingPrice = typeof existing?.price_cents === 'number' ? existing.price_cents : Number.MAX_SAFE_INTEGER;
      if (!existing || price < existingPrice) {
        pmap.set(key, p);
      }
    }
    const list = Array.from(pmap.values());

    const grupos = {
      individuales: [] as any[],
      cuatro: [] as any[],
      rituales: [] as any[],
      paraDos: [] as any[],
    };

    list.forEach((p: any) => {
      const name = p?.services?.name || p?.name || "";
      const desc = p?.services?.description || p?.description || "";
      if (isCuatroManos(name)) grupos.cuatro.push(p);
      else if (isRitual(name, desc)) grupos.rituales.push(p);
      else if (isDuo(name)) grupos.paraDos.push(p);
      else grupos.individuales.push(p);
    });
    return grupos;
  }, [packages]);

  useEffect(() => {
    document.title = `${t('buy_voucher')} | The Nook Madrid`;
  }, [t]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            <div className="flex items-center space-x-2">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <article>
          <header className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t('voucher_page_title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('voucher_page_description')}
              </p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">{t('cart')} ({items.length})</Button>
              </SheetTrigger>
              <SheetContent className="w-[90vw] sm:w-[480px]">
                <SheetHeader>
                  <SheetTitle>{t('your_cart')}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('cart_empty')}</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                          <div>
                            <p className="text-sm font-medium leading-tight">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {currency(item.priceCents)} · {item.sessionsCount} sesiones
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => remove(item.id)}>
                            {t('remove')}
                          </Button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t pt-3">
                        <span className="text-sm text-muted-foreground">{t('total')}</span>
                        <span className="font-semibold">{currency(totalCents)}</span>
                      </div>
                      
                      {/* Campos de comprado por */}
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
                      
                      {/* ¿Es un regalo? */}
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
                                placeholder="email@ejemplo.com"
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
                      
                      <PaymentMethodsInfo />
                      <div className="flex gap-2 pt-1">
                        <Button variant="secondary" onClick={clear} className="flex-1">
                          {t('empty_cart_button')}
                        </Button>
                        <Button
                          className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                          onClick={async () => {
                            if (items.length === 0) return;
                            if (!purchasedByName.trim()) {
                              toast.error(t('buyer_name_error'));
                              return;
                            }
                            if (!purchasedByEmail.trim()) {
                              toast.error(t('buyer_email_error'));
                              return;
                            }
                            if (isGift && !recipientName.trim()) {
                              toast.error("Por favor, indica el nombre del beneficiario");
                              return;
                            }
                            try {
                              const checkoutItems = items.map((item) => {
                                if (!item.packageId) {
                                  throw new Error("No se encontró el bono seleccionado. Actualiza la página e inténtalo nuevamente.");
                                }
                                return {
                                  package_id: item.packageId,
                                  quantity: 1,
                                };
                              });

                              const payload = {
                                intent: "package_voucher" as const,
                                package_voucher: {
                                  items: checkoutItems,
                                  purchaser_name: purchasedByName.trim(),
                                  purchaser_email: purchasedByEmail.trim(),
                                  is_gift: isGift,
                                  recipient_name: isGift ? recipientName.trim() : undefined,
                                  recipient_email: isGift ? recipientEmail.trim() : undefined,
                                  gift_message: isGift ? giftMessage.trim() : undefined,
                                },
                                currency: "eur" as const,
                              };

                              const { data, error } = await supabase.functions.invoke("create-checkout", { body: payload });
                              if (error) throw error;

                              const checkoutUrl =
                                data?.url ||
                                (data?.client_secret ? `https://checkout.stripe.com/c/pay/${data.client_secret}` : null);
                              if (!checkoutUrl) throw new Error("No se pudo iniciar el pago.");

                              window.location.href = checkoutUrl;
                              toast.success('Redirigiendo a Stripe...');

                              clear();
                              setPurchasedByName("");
                              setPurchasedByEmail("");
                              setIsGift(false);
                              setRecipientName("");
                              setRecipientEmail("");
                              setGiftMessage("");
                            } catch (e: any) {
                              console.error('Error al iniciar checkout:', e);
                              toast.error(e?.message || "No se pudo iniciar el pago");
                            }
                          }}
                        >
                          {t('proceed_to_payment')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </header>

          <section aria-label="Listado de bonos">
            <Accordion type="multiple" defaultValue={[]} className="w-full">
              {([
                ["masajes-individuales", "🧘 Masajes Individuales", categorized.individuales],
                ["masajes-cuatro-manos", "✋ Masajes a Cuatro Manos", categorized.cuatro],
                ["rituales", "🌸 Rituales", categorized.rituales],
                ["para-dos-personas", "💑 Para Dos Personas", categorized.paraDos],
              ] as [string, string, any[]][])
                .filter(([, , list]) => list.length > 0)
                .map(([key, label, list]) => (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger className="px-3 text-lg font-bold text-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {label}
                    </AccordionTrigger>
                    <AccordionContent className="px-3 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {list.map((item) => (
                          <Card key={item.id} className="flex flex-col">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base leading-snug md:line-clamp-2" title={item.name}>
                                {item.name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-3">
                              <p className="text-xs text-muted-foreground min-h-8">
                                {item.sessions_count} sesiones
                              </p>
                              <p className="font-semibold">{currency(item.price_cents)}</p>
                            </CardContent>
                            <CardFooter>
                              <Button 
                                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300" 
                                onClick={() => add({ 
                                  name: item.name, 
                                  priceCents: item.price_cents,
                                  packageId: item.id,
                                  sessionsCount: item.sessions_count
                                })}
                              >
                                {t('add_to_cart')}
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </section>
        </article>
      </main>
    </div>
  );
}
