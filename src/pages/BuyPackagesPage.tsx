import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PaymentMethodsInfo } from "@/components/PaymentMethodsInfo";
import { useTranslation } from "@/hooks/useTranslation";

interface CartItem {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
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
    toast.success("Añadido al carrito");
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);
  const totalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    [items]
  );

  return { items, add, remove, clear, totalCents };
};

const BuyPackagesPage = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [purchasedByName, setPurchasedByName] = useState("");
  const [purchasedByEmail, setPurchasedByEmail] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const { t } = useTranslation();

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
    const individuales = packageItems.filter((i) => i.type === "fixed" && !isCuatroManos(i.name) && !isRitual(i.name) && !isDuo(i.name));
    const cuatro = packageItems.filter((i) => i.type === "fixed" && isCuatroManos(i.name));
    const rituales = packageItems.filter((i) => i.type === "fixed" && isRitual(i.name));
    const paraDos = packageItems.filter((i) => i.type === "fixed" && isDuo(i.name));
    return { individuales, cuatro, rituales, paraDos };
  }, [packageItems]);

  const { items, add, remove, clear, totalCents } = useLocalCart();

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
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/" className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                ← The Nook Madrid
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
              <h1 className="text-2xl font-bold">Bonos de Masaje</h1>
              <p className="text-sm text-muted-foreground">
                Ahorra comprando paquetes de sesiones con descuento.
              </p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Carrito ({items.length})</Button>
              </SheetTrigger>
              <SheetContent className="w-[90vw] sm:w-[480px]">
                <SheetHeader>
                  <SheetTitle>Tu carrito</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Tu carrito está vacío.</p>
                  ) : (
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
                            Quitar
                          </Button>
                        </div>
                      ))}
                       <div className="flex items-center justify-between border-t pt-3">
                         <span className="text-sm text-muted-foreground">Total</span>
                         <span className="font-semibold">{euro(totalCents)}</span>
                       </div>
                       
                       {/* Campos de comprado por */}
                       <div className="space-y-3 border-t pt-3">
                         <div>
                           <Label htmlFor="purchased_by_name" className="text-sm">Comprado por (nombre)</Label>
                           <Input
                             id="purchased_by_name"
                             value={purchasedByName}
                             onChange={(e) => setPurchasedByName(e.target.value)}
                             placeholder="Nombre del comprador"
                             className="mt-1"
                           />
                         </div>
                         
                         <div>
                           <Label htmlFor="purchased_by_email" className="text-sm">Email del comprador</Label>
                           <Input
                             id="purchased_by_email"
                             type="email"
                             value={purchasedByEmail}
                             onChange={(e) => setPurchasedByEmail(e.target.value)}
                             placeholder="email@ejemplo.com"
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
                            <Label htmlFor="is_gift" className="text-sm">¿Es un regalo?</Label>
                          </div>
                          
                          {isGift && (
                            <div className="space-y-3 mt-3 pl-6 border-l-2 border-primary/20">
                              <div>
                                <Label htmlFor="recipient_name" className="text-sm">Para (nombre del destinatario) *</Label>
                                <Input
                                  id="recipient_name"
                                  value={recipientName}
                                  onChange={(e) => setRecipientName(e.target.value)}
                                  placeholder="Nombre del destinatario"
                                  className="mt-1"
                                  required={isGift}
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="recipient_email" className="text-sm">Email del destinatario</Label>
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
                                <Label htmlFor="gift_message" className="text-sm">Mensaje de regalo (opcional)</Label>
                                <Textarea
                                  id="gift_message"
                                  value={giftMessage}
                                  onChange={(e) => setGiftMessage(e.target.value)}
                                  placeholder="Tu mensaje personalizado..."
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
                          Vaciar
                        </Button>
                         <Button className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" onClick={async () => {
                           if (items.length === 0) return;
                           if (isGift && !recipientName.trim()) {
                             toast.error("Por favor, indica el nombre del destinatario");
                             return;
                           }
                           if (!purchasedByName.trim()) {
                             toast.error("Por favor, indica tu nombre");
                             return;
                           }
                           if (!purchasedByEmail.trim()) {
                             toast.error("Por favor, indica tu email");
                             return;
                           }

                           try {
                             const { data, error } = await supabase.functions.invoke('purchase-voucher', {
                               body: {
                                 purchaser_name: purchasedByName,
                                 purchaser_email: purchasedByEmail,
                                 items: items,
                                 total_cents: totalCents,
                                 type: 'package',
                                 is_gift: isGift,
                                 recipient_name: isGift ? recipientName : null,
                                 recipient_email: isGift ? recipientEmail : null,
                                 gift_message: isGift ? giftMessage : null,
                               }
                             });

                             if (error) throw error;

                             toast.success("¡Compra procesada exitosamente!");
                             clear();
                             setPurchasedByName("");
                             setPurchasedByEmail("");
                             setIsGift(false);
                             setRecipientName("");
                             setRecipientEmail("");
                             setGiftMessage("");
                           } catch (error) {
                             console.error('Error purchasing packages:', error);
                             toast.error("Error al procesar la compra. Inténtalo de nuevo.");
                           }
                         }}>
                           Comprar {euro(totalCents)}
                         </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </header>

          <section className="grid gap-6">
            <Accordion type="multiple" defaultValue={[]} className="space-y-4">
              {groups.individuales.length > 0 && (
                <AccordionItem value="bonos-individuales" className="border rounded-lg p-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">Bonos para Masajes Individuales</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groups.individuales.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base leading-tight">{pkg.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-1">
                              {pkg.sessions_count && (
                                <p className="text-sm text-muted-foreground">{pkg.sessions_count} sesiones</p>
                              )}
                              <p className="text-lg font-bold text-primary">{euro(pkg.priceCents!)}</p>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => add({ name: pkg.name, priceCents: pkg.priceCents! })}
                            >
                              Añadir al carrito
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {groups.paraDos.length > 0 && (
                <AccordionItem value="bonos-dos-personas" className="border rounded-lg p-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">Bonos para Masajes en Pareja</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groups.paraDos.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base leading-tight">{pkg.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-1">
                              {pkg.sessions_count && (
                                <p className="text-sm text-muted-foreground">{pkg.sessions_count} sesiones</p>
                              )}
                              <p className="text-lg font-bold text-primary">{euro(pkg.priceCents!)}</p>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => add({ name: pkg.name, priceCents: pkg.priceCents! })}
                            >
                              Añadir al carrito
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {groups.cuatro.length > 0 && (
                <AccordionItem value="bonos-cuatro-manos" className="border rounded-lg p-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">Bonos para Masajes a 4 Manos</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groups.cuatro.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base leading-tight">{pkg.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-1">
                              {pkg.sessions_count && (
                                <p className="text-sm text-muted-foreground">{pkg.sessions_count} sesiones</p>
                              )}
                              <p className="text-lg font-bold text-primary">{euro(pkg.priceCents!)}</p>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => add({ name: pkg.name, priceCents: pkg.priceCents! })}
                            >
                              Añadir al carrito
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {groups.rituales.length > 0 && (
                <AccordionItem value="bonos-rituales" className="border rounded-lg p-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <h2 className="text-lg font-semibold">Bonos para Rituales</h2>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groups.rituales.map((pkg) => (
                        <Card key={pkg.id} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base leading-tight">{pkg.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <div className="space-y-1">
                              {pkg.sessions_count && (
                                <p className="text-sm text-muted-foreground">{pkg.sessions_count} sesiones</p>
                              )}
                              <p className="text-lg font-bold text-primary">{euro(pkg.priceCents!)}</p>
                            </div>
                          </CardContent>
                          <CardFooter className="pt-2">
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => add({ name: pkg.name, priceCents: pkg.priceCents! })}
                            >
                              Añadir al carrito
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

export default BuyPackagesPage;