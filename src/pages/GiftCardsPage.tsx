import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

function useGiftOptions() {
  const [giftOptions, setGiftOptions] = useState<{ id: string; name: string; amount_cents: number }[]>([]);

  useEffect(() => {
    supabase
      .from('gift_card_options')
      .select('id,name,amount_cents,is_active')
      .eq('is_active', true)
      .order('amount_cents', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setGiftOptions((data || []).map((d: any) => ({ id: d.id, name: d.name, amount_cents: d.amount_cents })));
      });
  }, []);

  return giftOptions;
}

// Simple local cart (persisted to localStorage)
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
  const giftOptions = useGiftOptions();
  const giftItems: GiftCardItem[] = useMemo(
    () => giftOptions.map((o) => ({ id: o.id, name: o.name, type: "fixed", priceCents: o.amount_cents } as GiftCardItem)),
    [giftOptions]
  );
  const { items, add, remove, clear, totalCents } = useLocalCart();
  const [customAmount, setCustomAmount] = useState<number | "">("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const presets = useMemo(() => giftOptions.map((o) => Math.round(o.amount_cents / 100)), [giftOptions]);

  useEffect(() => {
    document.title = "Tarjetas de Regalo | The Nook Madrid";

    const desc = "Tarjetas de regalo elegantes para todos los tratamientos en The Nook Madrid.";
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
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                The Nook Madrid
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                <Link to="/admin-login">Admin</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6">
        <article>
          <header className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Tarjetas de Regalo</h1>
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
                      <div className="flex gap-2 pt-1">
                        <Button variant="secondary" onClick={clear} className="flex-1">
                          Vaciar
                        </Button>
                        <Button className="flex-1" onClick={async () => {
                          if (items.length === 0) return;
                          try {
                            const payload = {
                              intent: "gift_cards",
                              gift_cards: {
                                items: items.map(i => ({ amount_cents: i.priceCents, quantity: i.quantity }))
                              },
                              currency: "eur"
                            };
                            const { data, error } = await supabase.functions.invoke("create-checkout", { body: payload });
                            if (error) throw error;
                            if (data?.url) {
                              window.open(data.url, "_blank");
                            }
                          } catch (e: any) {
                            toast.error(e.message || "No se pudo iniciar el pago");
                          }
                        }}>
                          Continuar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </header>

          <section aria-label="Listado de tarjetas de regalo">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {[...giftItems, custom].map((item) => (
                <Card key={item.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base leading-snug line-clamp-2" title={item.name}>
                      {item.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={`Tarjeta de regalo ${item.name}`}
                        className="h-auto w-full object-cover rounded-md"
                        loading="lazy"
                      />
                    )}
                    <p className="text-xs text-muted-foreground min-h-8">
                      {item.description}
                    </p>
                    {item.type === "fixed" ? (
                      <p className="font-semibold">{euro(item.priceCents!)}</p>
                    ) : (
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
                          <Button size="sm" onClick={addCustomToCart}>
                            Comprar
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Consejo: puedes elegir un importe fijo o escribir otro importe.
                        </p>
                      </div>
                    )}
                  </CardContent>
                  {item.type === "fixed" && (
                    <CardFooter>
                      <Button className="w-full" onClick={() => add({ name: item.name, priceCents: item.priceCents! })}>
                        Comprar
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          </section>
        </article>
      </main>
    </div>
  );
};

export default GiftCardsPage;
