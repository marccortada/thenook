import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PaymentMethodsInfo } from "@/components/PaymentMethodsInfo";
import { useTranslation } from "@/hooks/useTranslation";
import PriceDisplay from "@/components/PriceDisplay";

interface CartItem {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  packageId?: string;
}

type PackageType = "fixed" | "custom";

interface PackageItem {
  id: string;
  name: string;
  type: PackageType;
  priceCents?: number; // only for fixed
  sessions_count?: number;
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

const BuyPackagesPage = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [purchasedByName, setPurchasedByName] = useState("");
  const [purchasedByEmail, setPurchasedByEmail] = useState("");
  const { t } = useTranslation();

  // Función para traducir nombres de paquetes
  const translatePackageName = (name: string) => {
    // Normalizar el nombre para usar como clave de traducción
    const normalizedKey = name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/'/g, '')
      .replace(/[^\w_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Buscar en las traducciones
    const translationKey = normalizedKey as any;
    const translation = t(translationKey);
    
    // Si no hay traducción específica, devolver el nombre original
    return translation !== translationKey ? translation : name;
  };

  // Hook para manejo del carrito local
  const useLocalCart = () => {
    const [items, setItems] = useState<CartItem[]>(() => {
      try {
        const raw = localStorage.getItem("cart:packages");
        return raw ? (JSON.parse(raw) as CartItem[]) : [];
      } catch {
        return [];
      }
    });
    useEffect(() => {
      localStorage.setItem("cart:packages", JSON.stringify(items));
    }, [items]);

    const add = (item: Omit<CartItem, "quantity" | "id"> & { quantity?: number }) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => {
          if (item.packageId && i.packageId) {
            return i.packageId === item.packageId;
          }
          return i.name === item.name && i.priceCents === item.priceCents;
        });
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + (item.quantity ?? 1) };
          return copy;
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: item.name,
            priceCents: item.priceCents,
            packageId: item.packageId,
            quantity: item.quantity ?? 1,
          },
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
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          services(name, duration_minutes),
          centers(name)
        `)
        .eq('active', true)
        .order('price_cents');
      if (!error) setPackages(data || []);
    })();
  }, []);

  const packageItems: PackageItem[] = useMemo(() => {
    return packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      type: 'fixed' as const,
      priceCents: pkg.price_cents,
      sessions_count: pkg.sessions_count,
      description: pkg.description,
    }));
  }, [packages]);

  const groups = useMemo(() => {
    const individuales = packageItems.filter(
      (i) => i.type === "fixed" && !isCuatroManos(i.name) && !isRitual(i.name) && !isDuo(i.name)
    );
    const cuatro = packageItems.filter((i) => i.type === "fixed" && isCuatroManos(i.name));
    const rituales = packageItems.filter((i) => i.type === "fixed" && isRitual(i.name) && !isDuo(i.name));
    const ritualesParaDos = packageItems.filter((i) => i.type === "fixed" && isRitual(i.name) && isDuo(i.name));
    const paraDos = packageItems.filter((i) => i.type === "fixed" && isDuo(i.name) && !isRitual(i.name));
    return { individuales, cuatro, rituales, ritualesParaDos, paraDos };
  }, [packageItems]);

  const { items, add, remove, clear, totalCents } = useLocalCart();

  useEffect(() => {
    if (isCartOpen) {
      setTimeout(() => {
        const modalElement = document.querySelector('[data-cart-dialog-content]');
        if (modalElement) {
          modalElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [isCartOpen]);

  useEffect(() => {
    document.title = "Bonos de Masaje | The Nook Madrid";
 
     const desc = "Bonos de masaje con descuento para todos los tratamientos en The Nook Madrid.";
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
              <h1 className="text-2xl font-bold">{t('massage_vouchers')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('save_buying_session_packages')}
              </p>
            </div>
            <Button variant="outline" onClick={() => setIsCartOpen(true)}>
              {t('cart')} ({items.length})
            </Button>
          </header>

          <section className="grid gap-6">
            <Accordion type="multiple" defaultValue={["bonos-individuales"]} className="space-y-4">
              <AccordionItem value="bonos-individuales" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">{t('individual_massages_packages')}</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {groups.individuales.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('no_individual_vouchers')}</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {groups.individuales.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-base leading-tight">{translatePackageName(pkg.name)}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                             <div className="space-y-1">
                               {pkg.sessions_count && (
                                 <p className="text-sm text-muted-foreground">{pkg.sessions_count} {t('sessions_count')}</p>
                               )}
                               <PriceDisplay originalPrice={pkg.priceCents!} className="text-lg font-bold" />
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                               onClick={() => {
                                 add({
                                   name: translatePackageName(pkg.name),
                                   priceCents: pkg.priceCents!,
                                   packageId: pkg.id,
                                 });
                                 setIsCartOpen(true);
                               }}
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

              <AccordionItem value="bonos-dos-personas" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">{t('couples_packages')}</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {groups.paraDos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('no_two_people_vouchers')}</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {groups.paraDos.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-base leading-tight">{translatePackageName(pkg.name)}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-1">
                              {pkg.sessions_count && (
                                 <p className="text-sm text-muted-foreground">{pkg.sessions_count} {t('sessions_count')}</p>
                              )}
                               <PriceDisplay originalPrice={pkg.priceCents!} className="text-lg font-bold" />
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                               onClick={() => {
                                 add({
                                   name: translatePackageName(pkg.name),
                                   priceCents: pkg.priceCents!,
                                   packageId: pkg.id,
                                 });
                                 setIsCartOpen(true);
                               }}
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

              <AccordionItem value="bonos-cuatro-manos" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">{t('four_hands_packages')}</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {groups.cuatro.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('no_four_hands_vouchers')}</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {groups.cuatro.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                             <CardTitle className="text-base leading-tight">{translatePackageName(pkg.name)}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-1">
                              {pkg.sessions_count && (
                                 <p className="text-sm text-muted-foreground">{pkg.sessions_count} {t('sessions_count')}</p>
                              )}
                               <PriceDisplay originalPrice={pkg.priceCents!} className="text-lg font-bold" />
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                               onClick={() => {
                                 add({
                                   name: translatePackageName(pkg.name),
                                   priceCents: pkg.priceCents!,
                                   packageId: pkg.id,
                                 });
                                 setIsCartOpen(true);
                               }}
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

              <AccordionItem value="bonos-rituales" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">{t('rituals_packages')}</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {groups.rituales.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('no_ritual_vouchers')}</p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {groups.rituales.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base leading-tight">{translatePackageName(pkg.name)}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-1">
                              {pkg.sessions_count && (
                                <p className="text-sm text-muted-foreground">{pkg.sessions_count} {t('sessions_count')}</p>
                              )}
                              <PriceDisplay originalPrice={pkg.priceCents!} className="text-lg font-bold" />
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                add({
                                  name: translatePackageName(pkg.name),
                                  priceCents: pkg.priceCents!,
                                  packageId: pkg.id,
                                });
                                setIsCartOpen(true);
                              }}
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

              <AccordionItem value="bonos-rituales-dos" className="border rounded-lg">
                <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <h2 className="text-lg font-semibold">{t('rituals_for_two')}</h2>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {groups.ritualesParaDos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('no_ritual_vouchers')}</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groups.ritualesParaDos.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base leading-tight">{translatePackageName(pkg.name)}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-1">
                              {pkg.sessions_count && (
                                <p className="text-sm text-muted-foreground">{pkg.sessions_count} {t('sessions_count')}</p>
                              )}
                              <PriceDisplay originalPrice={pkg.priceCents!} className="text-lg font-bold" />
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                add({
                                  name: translatePackageName(pkg.name),
                                  priceCents: pkg.priceCents!,
                                  packageId: pkg.id,
                                });
                                setIsCartOpen(true);
                              }}
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
            </Accordion>
          </section>
        </article>
      </main>

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent
          data-cart-dialog-content
          className="w-[95vw] max-w-[600px] max-h-[90vh] p-0 overflow-hidden flex flex-col"
        >
          <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b bg-background">
            <DialogTitle>{t('your_cart')}</DialogTitle>
            <DialogDescription className="sr-only">{t('your_cart')}</DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4" style={{ height: "calc(90vh - 180px)" }}>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('cart_empty')}</p>
            ) : (
              <div className="space-y-4">
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

                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('total')}</span>
                    <span className="font-semibold">{euro(totalCents)}</span>
                  </div>
                </div>

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
              </div>
            )}
          </div>

          <div className="border-t bg-background px-6 py-4 space-y-3">
            <PaymentMethodsInfo />
            <div className="flex gap-2">
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

                  try {
                    const checkoutItems = items.map((item) => {
                      const pkg = packages.find((p: any) => {
                        if (item.packageId) {
                          return p.id === item.packageId;
                        }
                        const translated = translatePackageName(p.name);
                        return (
                          (translated === item.name || p.name === item.name) &&
                          p.price_cents === item.priceCents
                        );
                      });
                      if (!pkg?.id) {
                        throw new Error(t('package_not_found'));
                      }
                      return {
                        package_id: pkg.id,
                        quantity: item.quantity,
                      };
                    });

                    const payload = {
                      intent: "package_voucher" as const,
                      package_voucher: {
                        items: checkoutItems,
                        purchaser_name: purchasedByName.trim(),
                        purchaser_email: purchasedByEmail.trim(),
                      },
                      currency: "eur" as const,
                    };

                    const { data, error } = await supabase.functions.invoke('create-checkout', { body: payload });
                    if (error) throw error;

                    const checkoutUrl =
                      data?.url ||
                      (data?.client_secret ? `https://checkout.stripe.com/c/pay/${data.client_secret}` : null);
                    if (!checkoutUrl) throw new Error('No se pudo iniciar el pago.');

                    window.location.href = checkoutUrl;
                    toast.success(t('redirecting_to_stripe'));
                    setIsCartOpen(false);

                    clear();
                    setPurchasedByName("");
                    setPurchasedByEmail("");
                  } catch (error: any) {
                    console.error('Error al procesar la compra:', error);
                    toast.error(error?.message || t('purchase_error'));
                  }
                }}
              >
                {t('buy_button')} {euro(totalCents)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyPackagesPage;
