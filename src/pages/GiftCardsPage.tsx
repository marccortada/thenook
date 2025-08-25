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

const custom: GiftCardItem = {
  id: "custom",
  name: "TARJETA REGALO por VALOR personalizado",
  type: "custom",
  description: "Elige un importe fijo o escribe otro importe.",
};

const PREDEFINED_GIFTS: GiftCardItem[] = [
  { id: 'gift-1', name: 'Piernas Cansadas', type: 'fixed', priceCents: 4500 },
  { id: 'gift-3', name: 'Masaje Descontracturante 55 minutos', type: 'fixed', priceCents: 6000 },
  { id: 'gift-4', name: 'Reflexología Podal', type: 'fixed', priceCents: 6000 },
  { id: 'gift-5', name: 'Shiatsu', type: 'fixed', priceCents: 6000 },
  { id: 'gift-6', name: 'Masaje para Embarazada 50 minutos', type: 'fixed', priceCents: 6000 },
  { id: 'gift-7', name: 'Masaje Relajante 55 minutos', type: 'fixed', priceCents: 6000 },
  { id: 'gift-8', name: 'Masaje Deportivo 50 minutos', type: 'fixed', priceCents: 6000 },
  { id: 'gift-9', name: 'Masaje con Piedras Calientes', type: 'fixed', priceCents: 6500 },
  { id: 'gift-10', name: 'Bambuterapia Masaje con Cañas de Bambú', type: 'fixed', priceCents: 6500 },
  { id: 'gift-11', name: 'Ritual Romántico Individual', type: 'fixed', priceCents: 7000 },
  { id: 'gift-12', name: 'Ritual Energizante Individual', type: 'fixed', priceCents: 7000 },
  { id: 'gift-13', name: 'Drenaje Linfático 75 minutos', type: 'fixed', priceCents: 7500 },
  { id: 'gift-14', name: 'Antiestrés The Nook', type: 'fixed', priceCents: 8000 },
  { id: 'gift-15', name: 'Masaje para Embarazada 75 minutos', type: 'fixed', priceCents: 8000 },
  { id: 'gift-16', name: 'Masaje Descontracturante 75 minutos', type: 'fixed', priceCents: 8000 },
  { id: 'gift-17', name: 'Masaje dos Personas 45 minutos', type: 'fixed', priceCents: 9000 },
  { id: 'gift-18', name: 'Ritual del Kobido Individual', type: 'fixed', priceCents: 9000 },
  { id: 'gift-19', name: 'Masaje 90 minutos', type: 'fixed', priceCents: 9000 },
  { id: 'gift-20', name: 'Ritual Sakura Individual', type: 'fixed', priceCents: 10000 },
  { id: 'gift-21', name: 'Masaje dos Personas 55 minutos', type: 'fixed', priceCents: 11000 },
  { id: 'gift-22', name: 'Masaje a Cuatro Manos 50 minutos', type: 'fixed', priceCents: 11000 },
  { id: 'gift-23', name: 'Masaje Relajante Extra Largo 110 minutos', type: 'fixed', priceCents: 11500 },
  { id: 'gift-24', name: 'Bambuterapia Masaje con Cañas de Bambú para dos Personas', type: 'fixed', priceCents: 12000 },
  { id: 'gift-25', name: 'Masaje con Piedras Calientes para dos personas', type: 'fixed', priceCents: 12000 },
  { id: 'gift-26', name: 'Ritual Beauty Individual', type: 'fixed', priceCents: 12500 },
  { id: 'gift-27', name: 'Ritual Energizante para dos Personas', type: 'fixed', priceCents: 13000 },
  { id: 'gift-28', name: 'Ritual Romántico para dos Personas', type: 'fixed', priceCents: 13000 },
  { id: 'gift-29', name: 'Masaje dos Personas 75 minutos', type: 'fixed', priceCents: 14000 },
  { id: 'gift-30', name: 'Masaje a Cuatro Manos 80 minutos', type: 'fixed', priceCents: 16000 },
  { id: 'gift-31', name: 'Ritual del Kobido para dos Personas', type: 'fixed', priceCents: 17000 },
  { id: 'gift-32', name: 'Masaje dos Personas 110 minutos', type: 'fixed', priceCents: 19000 },
  { id: 'gift-33', name: 'Ritual Sakura para dos Personas', type: 'fixed', priceCents: 19000 },
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


const GiftCardsPage = () => {
  const [giftOptions, setGiftOptions] = useState<any[]>([]);
  const [purchasedByName, setPurchasedByName] = useState("");
  const [purchasedByEmail, setPurchasedByEmail] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const { t } = useTranslation();

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
    const byName = new Map((giftOptions || []).map((o: any) => [normalize(o.name || ''), o]));
    return PREDEFINED_GIFTS.map((ci) => {
      const match = byName.get(normalize(ci.name));
      return {
        id: match?.id ?? ci.id,
        name: ci.name,
        type: 'fixed' as const,
        priceCents: match?.amount_cents ?? ci.priceCents,
        description: (ci as any).description,
        imageUrl: (ci as any).imageUrl,
      };
    });
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
      toast.error("Indica un importe válido");
      return;
    }
    add({ name: custom.name, priceCents: Math.round(amount * 100) });
  };

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
              <h1 className="text-2xl font-bold">Tarjetas Regalo</h1>
              <p className="text-sm text-muted-foreground">
                Elige tu tarjeta regalo. Diseño elegante y 100% responsive.
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
                           try {
                             const payload = {
                               intent: "gift_cards",
                                gift_cards: {
                                  items: items.map(i => ({ 
                                    amount_cents: i.priceCents, 
                                    quantity: i.quantity,
                                    purchased_by_name: purchasedByName || undefined,
                                    purchased_by_email: purchasedByEmail || undefined,
                                    is_gift: isGift,
                                    recipient_name: isGift ? recipientName : undefined,
                                    recipient_email: isGift ? recipientEmail : undefined,
                                    gift_message: isGift ? giftMessage : undefined
                                  }))
                                },
                               currency: "eur"
                             };
                            const { data, error } = await supabase.functions.invoke("create-checkout", { body: payload });
                            if (error) throw error;
                            if (data?.url) {
                              window.location.href = data.url;
                            }
                          } catch (e: any) {
                            toast.error(e.message || "No se pudo iniciar el pago");
                          }
                        }}>
                          Proceder al Pago
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </header>

          <section aria-label="Listado de tarjetas de regalo">
            <Accordion type="multiple" defaultValue={[]} className="w-full">
              {([
                ["masajes-individuales", "🧘 Masajes Individuales", groups.individuales],
                ["masajes-cuatro-manos", "✋ Masajes a Cuatro Manos", groups.cuatro],
                ["rituales", "🌸 Rituales", groups.rituales],
                ["para-dos-personas", "💑 Para Dos Personas", groups.paraDos],
              ] as [string, string, GiftCardItem[]][])
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
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={`Tarjeta de regalo ${item.name}`}
                                  className="h-auto w-full object-cover rounded-md"
                                  loading="lazy"
                                />
                              )}
                              <p className="text-xs text-muted-foreground min-h-8">
                                {item.description || item.name}
                              </p>
                              <p className="font-semibold">{euro(item.priceCents!)}</p>
                            </CardContent>
                            <CardFooter>
                              <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300" onClick={() => add({ name: item.name, priceCents: item.priceCents! })}>
                                Añadir al Carrito
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              
              {/* Personalizado */}
              <AccordionItem value="importe-personalizado">
                <AccordionTrigger className="px-3 text-lg font-bold text-primary bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  💰 Importe Personalizado
                </AccordionTrigger>
                <AccordionContent className="px-3 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <Card key={custom.id} className="flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base leading-snug md:line-clamp-2" title={custom.name}>
                          {custom.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-3">
                        <p className="text-xs text-muted-foreground min-h-8">{custom.description}</p>
                        <div className="space-y-2">
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
                              placeholder="Otro importe (€)"
                              className="h-9"
                            />
                            <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" onClick={addCustomToCart}>
                              Añadir
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Consejo: puedes elegir un importe fijo o escribir otro importe.
                          </p>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300" onClick={addCustomToCart}>
                          Añadir al Carrito
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
